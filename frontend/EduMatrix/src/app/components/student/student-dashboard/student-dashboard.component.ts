import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  Chart,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

import { AuthService } from '../../../services/auth.service';
import { GradeItemDto, GradeService, GradeSubjectDto } from '../../../services/grade.service';
import { DayOfWeek, TimetableDto, TimetableService } from '../../../services/timetable.service';
import { NoteDto, NotesService } from '../../../services/notes.service';

interface SummaryCard {
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone: 'tone-primary' | 'tone-success' | 'tone-warning' | 'tone-neutral';
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, CardModule, TagModule],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.scss'
})
export class StudentDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('averageChartCanvas') averageChartCanvas?: ElementRef<HTMLCanvasElement>;

  private averageChart?: Chart<'line'>;
  private viewInitialized = false;

  studentName = 'Diák';
  className: string | null = null;

  loading = true;
  loadError: string | null = null;

  summaryCards: SummaryCard[] = [];
  notesSummaryValue = '0';
  notesSummaryHint = 'A tanári feljegyzések itt jelennek meg';

  chartMonths = ['Szeptember', 'Október', 'November', 'December', 'Január', 'Február', 'Március', 'Április', 'Május', 'Június'];
  chartSeries = Array(this.chartMonths.length).fill(0);
  chartHeadlineValue = '0.00';
  chartHeadlineLabel = 'tanulmányi átlag';
  chartDeltaLabel = 'Havi bontásban, a tanév rendje szerint';

  constructor(
    private authService: AuthService,
    private gradeService: GradeService,
    private timetableService: TimetableService,
    private notesService: NotesService,
  ) {
    Chart.register(
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      CategoryScale,
      Filler,
      Tooltip,
      Legend,
    );
  }

  ngOnInit(): void {
    this.loadStudentName();
    void this.loadDashboard();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.averageChart?.destroy();
  }

  private loadStudentName(): void {
    try {
      const user = this.authService.getUser();
      if (user) {
        this.studentName = user.full_name || user.username || 'Diák';
      }
    } catch (error) {
      console.error('Hiba a felhasználó nevének beolvasásakor:', error);
    }
  }

  private async loadDashboard(): Promise<void> {
    this.loading = true;
    this.loadError = null;

    try {
      const [gradesResult, subjectsResult, timetableResult, notesResult] = await Promise.allSettled([
        firstValueFrom(this.gradeService.getMyGrades()),
        firstValueFrom(this.gradeService.getMyGradeSubjects()),
        firstValueFrom(this.timetableService.getMyTimetable()),
        firstValueFrom(this.notesService.getNotes()),
      ]);

      const grades = this.unwrapSettled(gradesResult);
      const subjects = this.unwrapSettled(subjectsResult);
      const timetable = this.unwrapSettled(timetableResult);
      const notes = this.unwrapSettled(notesResult);

      this.buildDashboardState(grades, subjects, timetable, notes);

      if ([gradesResult, subjectsResult, timetableResult, notesResult].every((result) => result.status === 'rejected')) {
        this.loadError = 'Nem sikerült betölteni a tanulói dashboard adatait.';
      }
    } catch (error) {
      console.error('Tanulói dashboard betöltési hiba:', error);
      this.loadError = 'Nem sikerült betölteni a tanulói dashboard adatait.';
      this.buildDashboardState([], [], [], []);
    } finally {
      this.loading = false;
      if (this.viewInitialized) {
        this.renderChart();
      }
    }
  }

  private buildDashboardState(
    grades: GradeItemDto[],
    subjectRows: GradeSubjectDto[],
    timetableRows: TimetableDto[],
    notes: NoteDto[],
  ): void {
    this.className = this.resolveClassName(grades, subjectRows);

    const average = this.getOverallAverage(grades);
    const latestGrade = this.getLatestGrade(grades);
    const nextLesson = this.getNextLesson(timetableRows);
    const latestNote = this.getLatestNote(notes);

    this.notesSummaryValue = notes.length > 0 ? `${notes.length}` : '0';
    this.notesSummaryHint = latestNote
      ? `${latestNote.title} · ${this.formatShortDateHu(latestNote.created_at)}`
      : 'A tanári feljegyzések itt jelennek meg';

    this.chartSeries = this.chartMonths.map((month) => this.getMonthAverage(grades, month));
    this.chartHeadlineValue = average > 0 ? average.toFixed(2) : '0.00';
    this.chartHeadlineLabel = 'tanulmányi átlag';
    this.chartDeltaLabel = grades.length > 0 ? `${grades.length} jegy alapján` : 'Még nincs rögzített jegy';

    this.summaryCards = [
      {
        label: 'Összes átlag',
        value: average > 0 ? average.toFixed(2) : '0.00',
        hint: grades.length > 0 ? `${grades.length} jegy alapján` : 'Még nincs értékelésed',
        icon: 'pi pi-chart-line',
        tone: 'tone-primary',
      },
      {
        label: 'Legutóbbi jegy',
        value: latestGrade ? `${Math.round(Number(latestGrade.grade))}` : '—',
        hint: latestGrade
          ? `${this.getSubjectName(latestGrade)} · ${this.formatShortDateHu(latestGrade.date)}`
          : 'Még nem érkezett új jegy',
        icon: 'pi pi-bolt',
        tone: 'tone-success',
      },
      {
        label: 'Következő óra',
        value: nextLesson ? `${this.dayLabelHu(nextLesson.day_of_week)} ${nextLesson.lesson_number}.` : '—',
        hint: nextLesson
          ? `${this.getLessonSubject(nextLesson)} · ${this.getLessonRoom(nextLesson)}`
          : 'Az órarendedben még nincs bejegyzés',
        icon: 'pi pi-calendar-plus',
        tone: 'tone-warning',
      },
      {
        label: 'Feljegyzések',
        value: this.notesSummaryValue,
        hint: this.notesSummaryHint,
        icon: 'pi pi-bookmark',
        tone: 'tone-neutral',
      },
    ];
  }

  private resolveClassName(grades: GradeItemDto[], subjectRows: GradeSubjectDto[]): string | null {
    const gradeClass = grades.find((item) => item.class?.name)?.class?.name ?? null;
    if (gradeClass) {
      return gradeClass;
    }

    return subjectRows.find((item) => item.class?.name)?.class?.name ?? null;
  }

  private getOverallAverage(grades: GradeItemDto[]): number {
    if (grades.length === 0) {
      return 0;
    }

    return grades.reduce((sum, item) => sum + Number(item.grade), 0) / grades.length;
  }

  private getLatestGrade(grades: GradeItemDto[]): GradeItemDto | null {
    return [...grades].sort((left, right) => (left.date < right.date ? 1 : -1))[0] ?? null;
  }

  private getLatestNote(notes: NoteDto[]): NoteDto | null {
    return [...notes].sort((left, right) => (left.created_at < right.created_at ? 1 : -1))[0] ?? null;
  }

  private getNextLesson(rows: TimetableDto[]): TimetableDto | null {
    if (rows.length === 0) {
      return null;
    }

    const sorted = [...rows].sort((left, right) => {
      const dayDelta = this.dayIndex(left.day_of_week) - this.dayIndex(right.day_of_week);
      if (dayDelta !== 0) {
        return dayDelta;
      }

      return left.lesson_number - right.lesson_number;
    });

    const todayIndex = this.dayIndex(this.currentDay());
    const upcomingToday = sorted.find((entry) => this.dayIndex(entry.day_of_week) === todayIndex);

    if (upcomingToday) {
      return upcomingToday;
    }

    return sorted.find((entry) => this.dayIndex(entry.day_of_week) > todayIndex) ?? sorted[0] ?? null;
  }

  private getMonthAverage(grades: GradeItemDto[], monthLabel: string): number {
    const monthlyGrades = grades.filter((item) => this.monthNameHu(item.date) === monthLabel).map((item) => Number(item.grade));
    if (monthlyGrades.length === 0) {
      return 0;
    }

    return monthlyGrades.reduce((sum, value) => sum + value, 0) / monthlyGrades.length;
  }

  private renderChart(): void {
    const canvas = this.averageChartCanvas?.nativeElement;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.32)');
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.chartMonths,
        datasets: [
          {
            label: 'Havi átlag',
            data: this.chartSeries,
            borderColor: 'rgb(14, 165, 233)',
            backgroundColor: gradient,
            fill: true,
            tension: 0.42,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHitRadius: 18,
            clip: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#fff',
            displayColors: false,
            callbacks: {
              label: (context) => `Átlag: ${Number(context.raw).toFixed(2)}`,
            },
          },
        },
        layout: {
          padding: { left: 4, right: 4, top: 8, bottom: 4 },
        },
        scales: {
          x: {
            display: true,
            grid: { display: false },
            border: { display: false },
            ticks: {
              autoSkip: true,
              maxRotation: 0,
              minRotation: 0,
              color: '#64748b',
              font: {
                size: 11,
                weight: 700,
              },
            },
          },
          y: {
            display: false,
            grid: { display: false },
            border: { display: false },
          },
        },
        animation: {
          duration: 650,
        },
      },
    };

    this.averageChart?.destroy();
    this.averageChart = new Chart(context, config);
  }

  private unwrapSettled<T>(result: PromiseSettledResult<T>): T {
    return result.status === 'fulfilled' ? result.value : ([] as unknown as T);
  }

  private getSubjectName(grade: GradeItemDto): string {
    return grade.subject?.name || 'Ismeretlen tantárgy';
  }

  private getLessonSubject(lesson: TimetableDto): string {
    return lesson.ClassSubject?.Subject?.name || 'Ismeretlen tantárgy';
  }

  private getLessonRoom(lesson: TimetableDto): string {
    return lesson.room_number || 'nincs terem';
  }

  private currentDay(): DayOfWeek {
    const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()] ?? 'Monday';
  }

  private dayIndex(day: DayOfWeek): number {
    const order: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const index = order.indexOf(day);
    return index >= 0 ? index : 0;
  }

  private dayLabelHu(day: DayOfWeek): string {
    const labels: Record<DayOfWeek, string> = {
      Monday: 'Hétfő',
      Tuesday: 'Kedd',
      Wednesday: 'Szerda',
      Thursday: 'Csütörtök',
      Friday: 'Péntek',
      Saturday: 'Szombat',
      Sunday: 'Vasárnap',
    };

    return labels[day];
  }

  private monthNameHu(isoDate: string): string {
    const month = Number(isoDate.split('-')[1] ?? 0);
    const names = [
      '',
      'Január',
      'Február',
      'Március',
      'Április',
      'Május',
      'Június',
      'Július',
      'Augusztus',
      'Szeptember',
      'Október',
      'November',
      'December',
    ];

    return names[month] ?? '';
  }

  private formatShortDateHu(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map((value) => Number(value));
    if (!year || !month || !day) {
      return isoDate;
    }

    const months = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];
    return `${months[month - 1]} ${day}.`;
  }

}
