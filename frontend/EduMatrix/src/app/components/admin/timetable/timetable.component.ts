import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';

import { AdminSidebarComponent } from '../layout/admin-sidebar/admin-sidebar.component';
import { AdminTopbarComponent } from '../layout/admin-topbar/admin-topbar.component';
import { AuthService } from '../../../services/auth.service';
import { ClassDto, ClassService } from '../../../services/class.service';
import { ClassSubjectDto, ClassSubjectService } from '../../../services/class-subject.service';
import { DayOfWeek, TimetableDto, TimetableService } from '../../../services/timetable.service';

interface SelectOption {
  label: string;
  value: string;
}

interface TimetableRow extends TimetableDto {
  className: string;
  subjectName: string;
  teacherName: string;
  roomNumber: string;
}

interface GridCell {
  day: DayOfWeek;
  lessonNumber: number;
  entries: TimetableRow[];
}

@Component({
  selector: 'app-timetable',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BadgeModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    IconFieldModule,
    InputIconModule,
    AdminSidebarComponent,
    AdminTopbarComponent,
  ],
  providers: [MessageService],
  templateUrl: './timetable.component.html',
  styleUrl: './timetable.component.scss',
})
export class TimetableComponent implements OnInit {
  adminName = signal<string>('Admin');
  loading = signal(false);
  dialogVisible = signal(false);
  isEditMode = signal(false);
  editingTimetableId = signal<string | null>(null);

  classes = signal<ClassDto[]>([]);
  classSubjects = signal<ClassSubjectDto[]>([]);
  timetables = signal<TimetableRow[]>([]);

  selectedClassId = signal('');
  selectedClassSubjectId = signal('');
  selectedDay = signal<DayOfWeek>('Monday');
  selectedLessonNumber = signal(1);
  selectedRoomNumber = signal('');

  readonly days: Array<{ label: string; value: DayOfWeek }> = [
    { label: 'Hétfő', value: 'Monday' },
    { label: 'Kedd', value: 'Tuesday' },
    { label: 'Szerda', value: 'Wednesday' },
    { label: 'Csütörtök', value: 'Thursday' },
    { label: 'Péntek', value: 'Friday' },
    { label: 'Szombat', value: 'Saturday' },
    { label: 'Vasárnap', value: 'Sunday' },
  ];

  readonly lessonNumbers = Array.from({ length: 10 }, (_, index) => index);

  navLinks = [
    { icon: 'pi pi-home', label: 'Vezérlőpult', routerLink: ['/admin/dashboard'] },
    { icon: 'pi pi-users', label: 'Felhasználók', routerLink: ['/admin/users'] },
    { icon: 'pi pi-sitemap', label: 'Osztályok', routerLink: ['/admin/classes'] },
    { icon: 'pi pi-book', label: 'Tantárgyak', routerLink: ['/admin/subjects'] },
    { icon: 'pi pi-table', label: 'Hozzárendelések', routerLink: ['/admin/class-subjects'] },
    { icon: 'pi pi-calendar', label: 'Órarend', routerLink: ['/admin/timetable'] },
  ];

  classOptions = computed<SelectOption[]>(() =>
    this.classes().map((item) => ({ label: item.name, value: item.id }))
  );

  selectedClass = computed(() =>
    this.classes().find((item) => item.id === this.selectedClassId()) || null
  );

  filteredClassSubjects = computed(() =>
    this.classSubjects().filter((item) => !this.selectedClassId() || item.class_id === this.selectedClassId())
  );

  classSubjectOptions = computed<SelectOption[]>(() =>
    this.filteredClassSubjects().map((item) => ({
      label: `${item.Class?.name || item.class_id} - ${item.Subject?.name || item.subject_id} - ${item.Teacher?.User?.full_name || item.teacher_id}`,
      value: item.id,
    }))
  );

  selectedClassRows = computed(() =>
    this.selectedClassId()
      ? this.timetables().filter((row) => row.ClassSubject?.class_id === this.selectedClassId())
      : this.timetables()
  );

  gridRows = computed(() => {
    const rows: Array<{ lessonNumber: number; cells: GridCell[] }> = [];
    for (const lessonNumber of this.lessonNumbers) {
      rows.push({
        lessonNumber,
        cells: this.days.map((day) => ({
          day: day.value,
          lessonNumber,
          entries: this.selectedClassRows().filter((row) => row.day_of_week === day.value && row.lesson_number === lessonNumber),
        })),
      });
    }
    return rows;
  });

  totalSlots = computed(() => this.selectedClassRows().length);
  conflictSlots = computed(() => {
    const seen = new Map<string, number>();
    for (const row of this.selectedClassRows()) {
      const key = `${row.day_of_week}:${row.lesson_number}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    return Array.from(seen.values()).filter((count) => count > 1).length;
  });

  constructor(
    private authService: AuthService,
    private messageService: MessageService,
    private classService: ClassService,
    private classSubjectService: ClassSubjectService,
    private timetableService: TimetableService,
  ) {
    this.loadAdminName();
  }

  ngOnInit(): void {
    void this.loadData();
  }

  loadAdminName(): void {
    const user = this.authService.getUser();
    if (user) {
      this.adminName.set(user.full_name || user.username || 'Admin');
    }
  }

  onClassFilterChange(classId: string): void {
    this.selectedClassId.set(classId);
    this.selectedClassSubjectId.set('');
  }

  openCreateDialog(day?: DayOfWeek, lessonNumber?: number): void {
    this.isEditMode.set(false);
    this.editingTimetableId.set(null);
    this.selectedDay.set(day || 'Monday');
    this.selectedLessonNumber.set(lessonNumber ?? 0);
    this.selectedClassSubjectId.set('');
    this.selectedRoomNumber.set('');

    if (!this.selectedClassId() && this.classes().length > 0) {
      this.selectedClassId.set(this.classes()[0].id);
    }

    this.dialogVisible.set(true);
  }

  openEditDialog(row: TimetableRow): void {
    this.isEditMode.set(true);
    this.editingTimetableId.set(row.id);
    this.selectedClassId.set(row.ClassSubject?.class_id || '');
    this.selectedClassSubjectId.set(row.class_subject_id);
    this.selectedDay.set(row.day_of_week);
    this.selectedLessonNumber.set(row.lesson_number);
    this.selectedRoomNumber.set(row.room_number || '');
    this.dialogVisible.set(true);
  }

  async saveTimetable(): Promise<void> {
    const classSubjectId = this.selectedClassSubjectId();
    const day = this.selectedDay();
    const lessonNumber = Number(this.selectedLessonNumber());
    const roomNumber = this.selectedRoomNumber().trim();

    if (!classSubjectId || !day || Number.isNaN(lessonNumber) || !roomNumber) {
      this.messageService.add({ severity: 'warn', summary: 'Hiányzó adat', detail: 'Minden mező kitöltése kötelező.' });
      return;
    }

    if (lessonNumber < 0 || lessonNumber > 9) {
      this.messageService.add({ severity: 'warn', summary: 'Érvénytelen óraszám', detail: 'Az óraszám 0 és 9 között kell, hogy legyen.' });
      return;
    }

    const selectedClassSubject = this.classSubjects().find((item) => item.id === classSubjectId);
    if (!selectedClassSubject) {
      this.messageService.add({ severity: 'warn', summary: 'Hiányzó adat', detail: 'A kiválasztott kapcsolat nem található.' });
      return;
    }

    const conflict = this.selectedClassRows().find((row) => {
      const sameSlot = row.day_of_week === day && row.lesson_number === lessonNumber;
      const sameClass = row.ClassSubject?.class_id === selectedClassSubject.class_id;
      const notCurrent = row.id !== this.editingTimetableId();
      return sameSlot && sameClass && notCurrent;
    });

    if (conflict) {
      this.messageService.add({
        severity: 'error',
        summary: 'Ütközés',
        detail: 'Ehhez az osztályhoz már van bejegyzés erre a napra és órára.',
      });
      return;
    }

    try {
      if (this.isEditMode() && this.editingTimetableId()) {
        await firstValueFrom(
          this.timetableService.updateTimetable(this.editingTimetableId() as string, {
            class_subject_id: classSubjectId,
            day_of_week: day,
            lesson_number: lessonNumber,
            room_number: roomNumber,
          })
        );
        this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Órarend bejegyzés módosítva.' });
      } else {
        await firstValueFrom(
          this.timetableService.createTimetable({
            class_subject_id: classSubjectId,
            day_of_week: day,
            lesson_number: lessonNumber,
            room_number: roomNumber,
          })
        );
        this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Órarend bejegyzés létrehozva.' });
      }

      this.dialogVisible.set(false);
      await this.loadTimetables();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Hiba',
        detail: error?.error?.message || 'Nem sikerült menteni az órarendet.',
      });
    }
  }

  async deleteTimetable(row: TimetableRow): Promise<void> {
    const ok = window.confirm('Biztosan törlöd ezt az órarendi bejegyzést?');
    if (!ok) {
      return;
    }

    try {
      await firstValueFrom(this.timetableService.deleteTimetable(row.id));
      this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Órarend bejegyzés törölve.' });
      await this.loadTimetables();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Hiba',
        detail: error?.error?.message || 'Nem sikerült törölni az órarendet.',
      });
    }
  }

  private async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const [classes, classSubjects] = await Promise.all([
        firstValueFrom(this.classService.getClasses()),
        firstValueFrom(this.classSubjectService.getClassSubjects()),
      ]);

      this.classes.set(classes);
      this.classSubjects.set(classSubjects);

      if (!this.selectedClassId() && classes.length > 0) {
        this.selectedClassId.set(classes[0].id);
      }

      await this.loadTimetables();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Hiba',
        detail: error?.error?.message || 'Nem sikerült betölteni az órarend adatokat.',
      });
    } finally {
      this.loading.set(false);
    }
  }

  private async loadTimetables(): Promise<void> {
    try {
      const rows = await firstValueFrom(this.timetableService.getTimetables());
      this.timetables.set(
        rows.map((row) => ({
          ...row,
          className: row.ClassSubject?.Class?.name || row.ClassSubject?.class_id || row.class_subject_id,
          subjectName: row.ClassSubject?.Subject?.name || row.class_subject_id,
          teacherName: row.ClassSubject?.Teacher?.User?.full_name || row.ClassSubject?.teacher_id || row.class_subject_id,
          roomNumber: row.room_number || '-',
        }))
      );
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Hiba',
        detail: error?.error?.message || 'Nem sikerült betölteni az órarend bejegyzéseket.',
      });
    }
  }

  cellEntries(day: DayOfWeek, lessonNumber: number): TimetableRow[] {
    return this.selectedClassRows().filter((row) => row.day_of_week === day && row.lesson_number === lessonNumber);
  }
}
