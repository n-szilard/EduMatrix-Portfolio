import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

import { AuthService } from '../../../services/auth.service';
import { AbsenceService, TeacherAbsenceDto } from '../../../services/absence.service';
import { NotesService, type NoteCategory, type NoteDto } from '../../../services/notes.service';
import { ClassSubjectService, ClassSubjectDto } from '../../../services/class-subject.service';
import { TimetableService, TimetableDto, DayOfWeek } from '../../../services/timetable.service';

interface QuickLink {
  title: string;
  description: string;
  icon: string;
  route: string;
}

interface SummaryCard {
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone: 'tone-primary' | 'tone-success' | 'tone-warning' | 'tone-neutral';
}

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, CardModule, TagModule],
  templateUrl: './teacher-dashboard.component.html',
  styleUrl: './teacher-dashboard.component.scss',
})
export class TeacherDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('absenceChartCanvas') absenceChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('notesChartCanvas') notesChartCanvas?: ElementRef<HTMLCanvasElement>;

  private absenceChart?: Chart<'doughnut'>;
  private notesChart?: Chart<'bar'>;
  private viewInitialized = false;

  loading = signal(true);
  loadError = signal<string | null>(null);

  private readonly authService: AuthService;
  private readonly absenceService: AbsenceService;
  private readonly notesService: NotesService;
  private readonly classSubjectService: ClassSubjectService;
  private readonly timetableService: TimetableService;

  constructor(
    authService: AuthService,
    absenceService: AbsenceService,
    notesService: NotesService,
    classSubjectService: ClassSubjectService,
    timetableService: TimetableService,
  ) {
    this.authService = authService;
    this.absenceService = absenceService;
    this.notesService = notesService;
    this.classSubjectService = classSubjectService;
    this.timetableService = timetableService;

    Chart.register(
      DoughnutController,
      ArcElement,
      BarController,
      BarElement,
      LinearScale,
      CategoryScale,
      Tooltip,
      Legend,
    );
  }

  readonly teacherName = computed(() => {
    const u = this.authService.getUser();
    return u?.full_name || u?.username || 'Tanár';
  });

  readonly summaryCards = signal<SummaryCard[]>([]);

  readonly classSubjects = signal<ClassSubjectDto[]>([]);
  readonly absences = signal<TeacherAbsenceDto[]>([]);
  readonly notes = signal<NoteDto[]>([]);
  readonly myTimetable = signal<TimetableDto[]>([]);

  readonly absenceStats = computed(() => {
    const items = this.absences();
    return {
      total: items.length,
      justified: items.filter((a) => a.justified).length,
      unjustified: items.filter((a) => !a.justified).length,
      today: items.filter((a) => a.date === this.todayIso()).length,
    };
  });

  readonly taughtClassCount = computed(() => {
    const set = new Set(this.classSubjects().map((cs) => cs.Class?.name ?? cs.class_id).filter(Boolean));
    return set.size;
  });

  readonly taughtSubjectCount = computed(() => {
    const set = new Set(this.classSubjects().map((cs) => cs.Subject?.name ?? cs.subject_id).filter(Boolean));
    return set.size;
  });

  readonly weeklyLessonCount = computed(() => (this.myTimetable() ?? []).length);

  readonly latestNote = computed(() => {
    const list = [...(this.notes() ?? [])].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return list[0] ?? null;
  });

  readonly notesByCategory = computed<Record<NoteCategory, number>>(() => {
    const out: Record<NoteCategory, number> = {
      'Tanulmányi': 0,
      'Személyes': 0,
      'Emlékeztető': 0,
    };

    for (const n of this.notes() ?? []) {
      const cat = n.category;
      if (cat in out) out[cat] += 1;
    }
    return out;
  });

  readonly quickLinks: QuickLink[] = [
    {
      title: 'Jegyek rögzítése',
      description: 'Osztály és tantárgy kiválasztása, jegyek felvitele.',
      icon: 'pi pi-book',
      route: '/teacher/grades',
    },
    {
      title: 'Feljegyzések',
      description: 'Tanári feljegyzések létrehozása és kezelése.',
      icon: 'pi pi-pencil',
      route: '/teacher/notes',
    },
    {
      title: 'Hiányzások',
      description: 'Hiányzások rögzítése és áttekintése.',
      icon: 'pi pi-check-square',
      route: '/teacher/absences',
    },
  ];

  async ngOnInit(): Promise<void> {
    await this.loadDashboard();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.scheduleRenderCharts();
  }

  ngOnDestroy(): void {
    this.absenceChart?.destroy();
    this.notesChart?.destroy();
  }

  async reload(): Promise<void> {
    await this.loadDashboard();
  }

  private async loadDashboard(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      const [classSubjectsResult, absencesResult, notesResult, timetableResult] = await Promise.allSettled([
        firstValueFrom(this.classSubjectService.getClassSubjects()),
        firstValueFrom(this.absenceService.getTeacherAbsences()),
        firstValueFrom(this.notesService.getNotes()),
        firstValueFrom(this.timetableService.getMyTimetable()),
      ]);

      const classSubjects = this.unwrapSettled(classSubjectsResult);
      const absences = this.unwrapSettled(absencesResult);
      const notes = this.unwrapSettled(notesResult);
      const timetable = this.unwrapSettled(timetableResult);

      this.classSubjects.set(classSubjects ?? []);
      this.absences.set(absences ?? []);
      this.notes.set(notes ?? []);
      this.myTimetable.set(timetable ?? []);

      this.buildSummaryCards();

      this.scheduleRenderCharts();

      if ([classSubjectsResult, absencesResult, notesResult, timetableResult].every((r) => r.status === 'rejected')) {
        this.loadError.set('Nem sikerült betölteni a tanári dashboard adatait.');
      }
    } catch (error) {
      console.error('Tanári dashboard betöltési hiba:', error);
      this.loadError.set('Nem sikerült betölteni a tanári dashboard adatait.');
      this.classSubjects.set([]);
      this.absences.set([]);
      this.notes.set([]);
      this.myTimetable.set([]);
      this.buildSummaryCards();
    } finally {
      this.loading.set(false);
      this.scheduleRenderCharts();
    }
  }

  private scheduleRenderCharts(): void {
    if (!this.viewInitialized) return;
    if (this.loading()) return;

    // Wait for Angular to paint the @if block so the canvases exist.
    setTimeout(() => this.renderCharts(), 0);
  }

  private buildSummaryCards(): void {
    const abs = this.absenceStats();
    const csCount = (this.classSubjects() ?? []).length;
    const classCount = this.taughtClassCount();
    const subjectCount = this.taughtSubjectCount();
    const notesCount = (this.notes() ?? []).length;
    const weeklyLessons = this.weeklyLessonCount();

    const latestNote = this.latestNote();
    const latestNoteHint = latestNote
      ? `${latestNote.title} · ${this.formatShortDateHu(latestNote.created_at)}`
      : 'Még nincs létrehozott feljegyzés';

    this.summaryCards.set([
      {
        label: 'Tanított csoportok',
        value: `${csCount}`,
        hint: `${classCount} osztály • ${subjectCount} tantárgy`,
        icon: 'pi pi-sitemap',
        tone: 'tone-primary',
      },
      {
        label: 'Heti órák',
        value: `${weeklyLessons}`,
        hint: weeklyLessons > 0 ? 'A saját beosztásod alapján' : 'Nincs még órarendi bejegyzés',
        icon: 'pi pi-calendar',
        tone: 'tone-warning',
      },
      {
        label: 'Hiányzások',
        value: `${abs.total}`,
        hint: `${abs.today} ma • ${abs.justified} igazolt • ${abs.unjustified} igazolatlan`,
        icon: 'pi pi-check-square',
        tone: 'tone-success',
      },
      {
        label: 'Feljegyzések',
        value: `${notesCount}`,
        hint: latestNoteHint,
        icon: 'pi pi-pencil',
        tone: 'tone-neutral',
      },
    ]);
  }

  private renderCharts(): void {
    this.renderAbsenceChart();
    this.renderNotesChart();
  }

  private renderAbsenceChart(): void {
    if (!this.absenceChartCanvas?.nativeElement) return;

    const stats = this.absenceStats();
    const justified = stats.justified;
    const unjustified = stats.unjustified;

    const data = [justified, unjustified];
    const hasData = data.some((n) => n > 0);

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Igazolt', 'Igazolatlan'],
        datasets: [
          {
            data: hasData ? data : [1, 1],
            backgroundColor: ['rgba(16, 185, 129, 0.85)', 'rgba(239, 68, 68, 0.85)'],
            borderColor: ['rgba(16, 185, 129, 1)', 'rgba(239, 68, 68, 1)'],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'rgba(226, 232, 240, 0.82)',
              boxWidth: 12,
            },
          },
          tooltip: { enabled: hasData },
        },
        cutout: '62%',
      },
    };

    this.absenceChart?.destroy();
    this.absenceChart = new Chart(this.absenceChartCanvas.nativeElement, config);
  }

  private renderNotesChart(): void {
    if (!this.notesChartCanvas?.nativeElement) return;

    const byCategory = this.notesByCategory();
    const labels: NoteCategory[] = ['Tanulmányi', 'Személyes', 'Emlékeztető'];
    const data = labels.map((l) => byCategory[l] ?? 0);
    const hasData = data.some((n) => n > 0);

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Feljegyzések',
            data: hasData ? data : [0, 0, 0],
            backgroundColor: ['rgba(37, 99, 235, 0.75)', 'rgba(124, 58, 237, 0.75)', 'rgba(245, 158, 11, 0.75)'],
            borderColor: ['rgba(37, 99, 235, 1)', 'rgba(124, 58, 237, 1)', 'rgba(245, 158, 11, 1)'],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: 'rgba(226, 232, 240, 0.78)' },
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: 'rgba(226, 232, 240, 0.72)' },
            grid: { color: 'rgba(148, 163, 184, 0.18)' },
          },
        },
      },
    };

    this.notesChart?.destroy();
    this.notesChart = new Chart(this.notesChartCanvas.nativeElement, config);
  }

  private unwrapSettled<T>(result: PromiseSettledResult<T>): T {
    return result.status === 'fulfilled' ? result.value : (undefined as unknown as T);
  }

  private formatShortDateHu(iso: string): string {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
    } catch {
      return iso;
    }
  }

  private todayIso(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  dayLabelHu(day: DayOfWeek): string {
    if (day === 'Monday') return 'Hétfő';
    if (day === 'Tuesday') return 'Kedd';
    if (day === 'Wednesday') return 'Szerda';
    if (day === 'Thursday') return 'Csütörtök';
    if (day === 'Friday') return 'Péntek';
    if (day === 'Saturday') return 'Szombat';
    if (day === 'Sunday') return 'Vasárnap';
    return day;
  }
}
