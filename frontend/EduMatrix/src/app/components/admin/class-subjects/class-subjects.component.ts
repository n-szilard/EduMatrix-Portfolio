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
import { SubjectDto, SubjectService } from '../../../services/subject.service';
import { TeacherDto, UserService } from '../../../services/user.service';

interface SelectOption {
  label: string;
  value: string;
}

interface ClassSubjectRow extends ClassSubjectDto {
  className: string;
  subjectName: string;
  teacherName: string;
}

@Component({
  selector: 'app-class-subjects',
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
  templateUrl: './class-subjects.component.html',
  styleUrl: './class-subjects.component.scss',
})
export class ClassSubjectsComponent implements OnInit {
  adminName = signal<string>('Admin');
  loading = signal(false);
  dialogVisible = signal(false);
  isEditMode = signal(false);
  editingClassSubjectId = signal<string | null>(null);

  classes = signal<ClassDto[]>([]);
  subjects = signal<SubjectDto[]>([]);
  teachers = signal<TeacherDto[]>([]);
  classSubjects = signal<ClassSubjectRow[]>([]);

  selectedClassId = signal('');
  selectedSubjectId = signal('');
  selectedTeacherId = signal('');

  navLinks = [
    { icon: 'pi pi-home', label: 'Vezérlőpult', routerLink: ['/admin/dashboard'] },
    { icon: 'pi pi-users', label: 'Felhasználók', routerLink: ['/admin/users'] },
    { icon: 'pi pi-sitemap', label: 'Osztályok', routerLink: ['/admin/classes'] },
    { icon: 'pi pi-book', label: 'Tantárgyak', routerLink: ['/admin/subjects'] },
    { icon: 'pi pi-table', label: 'Hozzárendelések', routerLink: ['/admin/class-subjects'] },
    { icon: 'pi pi-calendar', label: 'Órarend', routerLink: ['/admin/timetable'] },
  ];

  totalConnections = computed(() => this.classSubjects().length);
  teacherCount = computed(() => new Set(this.classSubjects().map((row) => row.teacher_id)).size);
  classCount = computed(() => new Set(this.classSubjects().map((row) => row.class_id)).size);

  classOptions = computed<SelectOption[]>(() =>
    this.classes().map((item) => ({ label: item.name, value: item.id }))
  );

  subjectOptions = computed<SelectOption[]>(() =>
    this.subjects().map((item) => ({ label: item.name, value: item.id }))
  );

  teacherOptions = computed<SelectOption[]>(() =>
    this.teachers().map((teacher) => ({
      label: teacher.User ? `${teacher.User.full_name} (@${teacher.User.username})` : teacher.user_id,
      value: teacher.id,
    }))
  );

  constructor(
    private authService: AuthService,
    private messageService: MessageService,
    private classService: ClassService,
    private subjectService: SubjectService,
    private userService: UserService,
    private classSubjectService: ClassSubjectService,
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

  openCreateDialog(): void {
    this.isEditMode.set(false);
    this.editingClassSubjectId.set(null);
    this.selectedClassId.set('');
    this.selectedSubjectId.set('');
    this.selectedTeacherId.set('');
    this.dialogVisible.set(true);
  }

  openEditDialog(row: ClassSubjectRow): void {
    this.isEditMode.set(true);
    this.editingClassSubjectId.set(row.id);
    this.selectedClassId.set(row.class_id);
    this.selectedSubjectId.set(row.subject_id);
    this.selectedTeacherId.set(row.teacher_id);
    this.dialogVisible.set(true);
  }

  async saveClassSubject(): Promise<void> {
    const classId = this.selectedClassId();
    const subjectId = this.selectedSubjectId();
    const teacherId = this.selectedTeacherId();

    if (!classId || !subjectId || !teacherId) {
      this.messageService.add({ severity: 'warn', summary: 'Hiányzó adat', detail: 'Minden mező kitöltése kötelező.' });
      return;
    }

    try {
      if (this.isEditMode() && this.editingClassSubjectId()) {
        await firstValueFrom(
          this.classSubjectService.updateClassSubject(this.editingClassSubjectId() as string, {
            class_id: classId,
            subject_id: subjectId,
            teacher_id: teacherId,
          })
        );
        this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Hozzárendelés módosítva.' });
      } else {
        await firstValueFrom(
          this.classSubjectService.createClassSubject({
            class_id: classId,
            subject_id: subjectId,
            teacher_id: teacherId,
          })
        );
        this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Hozzárendelés létrehozva.' });
      }

      this.dialogVisible.set(false);
      await this.loadClassSubjects();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Hiba',
        detail: error?.error?.message || 'Nem sikerült menteni a hozzárendelést.',
      });
    }
  }

  async deleteClassSubject(row: ClassSubjectRow): Promise<void> {
    const ok = window.confirm(`Biztosan törlöd ezt a hozzárendelést: ${row.className} - ${row.subjectName}?`);
    if (!ok) {
      return;
    }

    try {
      await firstValueFrom(this.classSubjectService.deleteClassSubject(row.id));
      this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Hozzárendelés törölve.' });
      await this.loadClassSubjects();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Hiba',
        detail: error?.error?.message || 'Nem sikerült törölni a hozzárendelést.',
      });
    }
  }

  private async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const [classes, subjects, teachers] = await Promise.all([
        firstValueFrom(this.classService.getClasses()),
        firstValueFrom(this.subjectService.getSubjects()),
        firstValueFrom(this.userService.getTeachers()),
      ]);

      this.classes.set(classes);
      this.subjects.set(subjects);
      this.teachers.set(teachers);
      await this.loadClassSubjects();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Hiba',
        detail: error?.error?.message || 'Nem sikerült betölteni az adatokat.',
      });
    } finally {
      this.loading.set(false);
    }
  }

  private async loadClassSubjects(): Promise<void> {
    try {
      const rows = await firstValueFrom(this.classSubjectService.getClassSubjects());
      this.classSubjects.set(
        rows.map((row) => ({
          ...row,
          className: row.Class?.name || row.class_id,
          subjectName: row.Subject?.name || row.subject_id,
          teacherName: row.Teacher?.User?.full_name || row.Teacher?.user_id || row.teacher_id,
        }))
      );
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Hiba',
        detail: error?.error?.message || 'Nem sikerült betölteni a hozzárendeléseket.',
      });
    }
  }
}
