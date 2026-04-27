import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AbsenceService, DayLessonDto, TeacherAbsenceDto } from '../../../services/absence.service';
import { ClassDto, ClassService, StudentDto } from '../../../services/class.service';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-teacher-absences',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    DropdownModule,
    CheckboxModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './teacher-absences.component.html',
  styleUrl: './teacher-absences.component.scss',
})
export class TeacherAbsencesComponent {
  constructor(
    private classService: ClassService,
    private absenceService: AbsenceService,
  ) {}

  classes = signal<ClassDto[]>([]);
  students = signal<StudentDto[]>([]);
  dayLessons = signal<DayLessonDto[]>([]);
  absences = signal<TeacherAbsenceDto[]>([]);

  selectedClassId = signal<string | null>(null);
  selectedStudentId = signal<string | null>(null);
  selectedDate = signal<string>(this.todayIso());
  selectedTimetableIds = signal<string[]>([]);

  loading = signal(false);
  loadingLessons = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  readonly classOptions = computed<SelectOption[]>(() =>
    this.classes().map((item) => ({ label: item.name, value: item.id }))
  );

  readonly studentOptions = computed<SelectOption[]>(() =>
    this.students()
      .filter((student) => !this.selectedClassId() || student.class_id === this.selectedClassId())
      .map((student) => ({
        value: student.id,
        label: student.User?.full_name ?? 'Ismeretlen tanuló',
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  );

  readonly stats = computed(() => {
    const items = this.absences();
    return {
      total: items.length,
      justified: items.filter((item) => item.justified).length,
      unjustified: items.filter((item) => !item.justified).length,
    };
  });

  readonly readyToLoadLessons = computed(() =>
    Boolean(this.selectedClassId() && this.selectedStudentId() && this.selectedDate())
  );

  readonly selectedLessonCount = computed(() => this.selectedTimetableIds().length);

  async ngOnInit(): Promise<void> {
    await this.loadInitialData();
  }

  async onClassChange(classId: string | null): Promise<void> {
    this.selectedClassId.set(classId);
    this.selectedStudentId.set(null);
    this.dayLessons.set([]);
    this.selectedTimetableIds.set([]);
    await this.loadAbsences();
  }

  async onStudentChange(studentId: string | null): Promise<void> {
    this.selectedStudentId.set(studentId);
    this.dayLessons.set([]);
    this.selectedTimetableIds.set([]);
    await this.loadAbsences();
  }

  async onDateChange(value: string): Promise<void> {
    this.selectedDate.set(value);
    this.dayLessons.set([]);
    this.selectedTimetableIds.set([]);
    await this.loadAbsences();
  }

  lessonChecked(timetableId: string): boolean {
    return this.selectedTimetableIds().includes(timetableId);
  }

  toggleLesson(timetableId: string): void {
    const current = new Set(this.selectedTimetableIds());
    if (current.has(timetableId)) {
      current.delete(timetableId);
    } else {
      current.add(timetableId);
    }
    this.selectedTimetableIds.set([...current]);
  }

  async loadLessonsForDay(): Promise<void> {
    const classId = this.selectedClassId();
    const date = this.selectedDate();

    if (!classId || !date) return;

    this.loadingLessons.set(true);
    this.error.set(null);

    try {
      const lessons = await firstValueFrom(this.absenceService.getDayLessons(classId, date));
      this.dayLessons.set(lessons ?? []);
      this.selectedTimetableIds.set([]);

      if (!lessons || lessons.length === 0) {
        this.error.set('Erre a napra nincs beosztott óra a kiválasztott osztályban.');
      }
    } catch (error: any) {
      this.dayLessons.set([]);
      this.error.set(error?.error?.message || 'Nem sikerült betölteni az aznapi órákat.');
    } finally {
      this.loadingLessons.set(false);
    }
  }

  async saveAbsenceSelection(): Promise<void> {
    const studentId = this.selectedStudentId();
    const date = this.selectedDate();
    const timetableIds = this.selectedTimetableIds();

    if (!studentId || !date || timetableIds.length === 0) {
      this.error.set('Válassz diákot, dátumot és legalább egy órát.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      await firstValueFrom(
        this.absenceService.markAbsences({
          student_id: studentId,
          date,
          timetable_ids: timetableIds,
        })
      );

      this.selectedTimetableIds.set([]);
      await this.loadAbsences();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Nem sikerült menteni a hiányzást.');
    } finally {
      this.saving.set(false);
    }
  }

  statusSeverity(justified: boolean): 'success' | 'danger' {
    return justified ? 'success' : 'danger';
  }

  async reloadAll(): Promise<void> {
    await Promise.all([this.loadInitialData(), this.loadAbsences()]);
  }

  private async loadInitialData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [classes, students] = await Promise.all([
        firstValueFrom(this.classService.getClasses()),
        firstValueFrom(this.classService.getAllStudents()),
      ]);

      this.classes.set(classes ?? []);
      this.students.set(students ?? []);
      await this.loadAbsences();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Nem sikerült betölteni a kezdő adatokat.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAbsences(): Promise<void> {
    try {
      const list = await firstValueFrom(
        this.absenceService.getTeacherAbsences({
          class_id: this.selectedClassId() ?? undefined,
          student_id: this.selectedStudentId() ?? undefined,
          date: this.selectedDate() || undefined,
        })
      );

      this.absences.set(list ?? []);
    } catch (error: any) {
      this.absences.set([]);
      this.error.set(error?.error?.message || 'Nem sikerült betölteni a hiányzás listát.');
    }
  }

  private todayIso(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}