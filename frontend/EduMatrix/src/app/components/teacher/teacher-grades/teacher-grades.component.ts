import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

import { GradeService, GradeItemDto, GradebookDto, GradebookStudentDto } from '../../../services/grade.service';
import { StudentDto } from '../../../services/class.service';
import { ClassSubjectService, ClassSubjectDto } from '../../../services/class-subject.service';

@Component({
  selector: 'app-teacher-grades',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TooltipModule,
    ButtonModule,
    DropdownModule,
    InputNumberModule,
    InputTextModule,
    TableModule,
  ],
  templateUrl: './teacher-grades.component.html',
  styleUrl: './teacher-grades.component.scss'
})
export class TeacherGradesComponent implements OnInit {
  constructor(
    private gradeService: GradeService,
    private classSubjectService: ClassSubjectService,
  ) {}

  // Adatok
  classSubjects = signal<ClassSubjectDto[]>([]);
  studentsInClass = signal<StudentDto[]>([]);
  gradebook = signal<GradebookDto | null>(null);

  // Kiválasztás / űrlap
  selectedClassSubjectId = signal<string | null>(null);
  draftDate = signal<string>('');

  // Diákonkénti gyors jegy beírás
  draftGradesByStudentId = signal<Record<string, number | null>>({});
  savingByStudentId = signal<Record<string, boolean>>({});

  // Állapot
  loadingSubjects = signal(false);
  loadingStudents = signal(false);
  loadError = signal<string | null>(null);

  headerTitle = signal<string>('Jegyek (tanár)');
  headerSubtitle = signal<string>('Válassz tantárgyat és osztályt, majd rögzíts jegyeket a diákoknak.');

  async ngOnInit(): Promise<void> {
    this.draftDate.set(this.todayIso());
    await this.loadTeacherClassSubjects();
  }

  classSubjectOptions = computed(() => {
    return this.classSubjects()
      .map((cs) => ({
        label: `${cs.Subject?.name ?? 'Ismeretlen tantárgy'} (${cs.Class?.name ?? 'osztály'})`,
        value: cs.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  private selectedClassSubject = computed(() => {
    const id = this.selectedClassSubjectId();
    return this.classSubjects().find((cs) => cs.id === id) ?? null;
  });

  async onClassSubjectChange(classSubjectId: string | null): Promise<void> {
    this.selectedClassSubjectId.set(classSubjectId);
    this.resetGradebookView();
    if (!classSubjectId) return;
    await this.loadGradebook(classSubjectId);
  }

  private async loadGradebook(classSubjectId: string): Promise<void> {
    this.loadingStudents.set(true);
    try {
      const gb = await firstValueFrom(this.gradeService.getGradebook(classSubjectId));
      this.gradebook.set(gb);

      // Minimál student DTO a táblához (név + osztály)
      const className = gb.classSubject?.class?.name ?? '';
      const list: StudentDto[] = (gb.students ?? []).map((s: GradebookStudentDto) =>
        this.toStudentRow(s, className)
      );

      list.sort((a, b) => (a.User?.full_name ?? '').localeCompare(b.User?.full_name ?? ''));
      this.studentsInClass.set(list);

      const init: Record<string, number | null> = {};
      for (const s of list) init[s.id] = null;
      this.draftGradesByStudentId.set(init);
    } catch (err: any) {
      this.resetGradebookView(err?.error?.message || 'Nem sikerült betölteni a naplót.');
    } finally {
      this.loadingStudents.set(false);
    }
  }

  setDraftGrade(studentId: string, value: number | null) {
    this.draftGradesByStudentId.update((m) => ({ ...m, [studentId]: value }));
  }

  async saveStudentGrade(studentId: string): Promise<void> {
    const classSubjectId = this.selectedClassSubjectId();
    const date = this.draftDate();
    const gradeValue = this.draftGradesByStudentId()[studentId];

    if (!classSubjectId || !date || !gradeValue) return;

    this.savingByStudentId.update((m) => ({ ...m, [studentId]: true }));
    try {
      await firstValueFrom(
        this.gradeService.createGrade({
          student_id: studentId,
          class_subject_id: classSubjectId,
          grade: gradeValue,
          date,
        })
      );

  // Üresre állítja az inputot mentés után
      this.draftGradesByStudentId.update((m) => ({ ...m, [studentId]: null }));

  // Újratöltés, hogy látszódjon azonnal az új jegy
      const csId = this.selectedClassSubjectId();
      if (csId) {
        await this.loadGradebook(csId);
      }
    } catch (err: any) {
      this.loadError.set(err?.error?.message || 'Nem sikerült a jegyet rögzíteni.');
    } finally {
      this.savingByStudentId.update((m) => ({ ...m, [studentId]: false }));
    }
  }

  private async loadTeacherClassSubjects(): Promise<void> {
    this.loadingSubjects.set(true);
    try {
      const list = await firstValueFrom(this.classSubjectService.getClassSubjects());
      this.classSubjects.set(list ?? []);
    } catch {
      this.classSubjects.set([]);
    } finally {
      this.loadingSubjects.set(false);
    }
  }

  selectedClassLabel = computed(() => {
    const cs = this.selectedClassSubject();
    if (!cs) return null;
    return `${cs.Class?.name ?? 'Osztály'} - ${cs.Subject?.name ?? 'Tantárgy'}`;
  });

  gradesForStudent(studentId: string): GradeItemDto[] {
    const gb = this.gradebook();
    const map = gb?.gradesByStudentId ?? {};
    return (map as any)[studentId] ?? [];
  }

  readonly monthKeys = ['09', '10', '11', '12', '01', '02', '03', '04', '05', '06'] as const;

  monthLabel(key: (typeof this.monthKeys)[number]): string {
    return key;
  }

  gradesForStudentByMonth(studentId: string): Record<string, GradeItemDto[]> {
    const list = this.gradesForStudent(studentId);
    const out: Record<string, GradeItemDto[]> = {};
    for (const k of this.monthKeys) out[k] = [];
    out['other'] = [];

    for (const g of list) {
      const m = this.monthFromIso(g.date);
      if (m && out[m]) out[m].push(g);
      else out['other'].push(g);
    }
    return out;
  }

  avgForStudent(studentId: string): string {
    const grades = this.gradesForStudent(studentId).map((g) => Number(g.grade)).filter((n) => !Number.isNaN(n));
    if (!grades.length) return '—';
    const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
    return avg.toFixed(2).replace('.', ',');
  }

  private monthFromIso(iso: string): string | null {
    if (!iso || iso.length < 7) return null;
    return iso.slice(5, 7);
  }

  private resetGradebookView(error: string | null = null) {
    this.studentsInClass.set([]);
    this.draftGradesByStudentId.set({});
    this.gradebook.set(null);
    this.loadError.set(error);
  }

  private toStudentRow(s: GradebookStudentDto, className: string): StudentDto {
    return {
      id: s.id,
      user_id: '',
      class_id: s.class_id ?? null,
      User: {
        id: '',
        username: '',
        email: '',
        full_name: s.full_name ?? '',
      },
      Class: { id: '', name: className },
    };
  }

  private todayIso(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
