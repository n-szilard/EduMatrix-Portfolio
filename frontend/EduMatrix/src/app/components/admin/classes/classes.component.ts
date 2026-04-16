import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { MessageService } from 'primeng/api';

import { AdminSidebarComponent } from '../layout/admin-sidebar/admin-sidebar.component';
import { AdminTopbarComponent } from '../layout/admin-topbar/admin-topbar.component';
import { ClassService, ClassDto, StudentDto } from '../../../services/class.service';
import { AuthService } from '../../../services/auth.service';

export interface Class {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
}

interface StudentOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    DropdownModule,
    ToastModule,
    TagModule,
    TooltipModule,
    BadgeModule,
    AdminSidebarComponent,
    AdminTopbarComponent,
  ],
  providers: [MessageService],
  templateUrl: './classes.component.html',
  styleUrl: './classes.component.scss'
})
export class ClassesComponent implements OnInit {
  adminName = signal<string>('Admin');
  displayAddClassDialog = signal(false);
  displayEditClassDialog = signal(false);
  displayStudentsDialog = signal(false);
  selectedClass = signal<Class | null>(null);
  classStudents = signal<StudentDto[]>([]);
  freeStudents = signal<StudentDto[]>([]);
  freeStudentOptions = signal<StudentOption[]>([]);
  selectedFreeStudentId = signal<string>('');
  newClassName = signal<string>('');
  editedClassName = signal<string>('');
  loading = signal<boolean>(false);

  classes = signal<Class[]>([]);

  totalStudents = computed(() => this.classes().reduce((sum, currentClass) => sum + currentClass.studentCount, 0));
  totalFreeStudents = computed(() => this.freeStudents().length);

  navLinks = [
    { label: 'Vezérlőpult', icon: 'pi pi-home', routerLink: '/admin/dashboard' },
    { label: 'Felhasználók', icon: 'pi pi-users', routerLink: '/admin/users' },
    { label: 'Osztályok', icon: 'pi pi-sitemap', routerLink: '/admin/classes' },
    { label: 'Tantárgyak', icon: 'pi pi-book', routerLink: '/admin/subjects' },
    { label: 'Hozzárendelések', icon: 'pi pi-table', routerLink: '/admin/class-subjects' },
    { label: 'Órarend', icon: 'pi pi-calendar', routerLink: '/admin/timetable' },
  ];

  constructor(
    private messageService: MessageService,
    private classService: ClassService,
    private authService: AuthService
  ) {
    this.loadAdminName();
  }

  ngOnInit(): void {
    void this.loadClasses();
  }

  loadAdminName() {
    const user = this.authService.getUser();
    if (user) {
      this.adminName.set(user.full_name || user.username);
    }
  }

  openAddClassDialog() {
    this.newClassName.set('');
    this.displayAddClassDialog.set(true);
  }

  async openStudentsDialog(classItem: Class) {
    this.selectedClass.set(classItem);
    this.displayStudentsDialog.set(true);
    await this.loadStudentsDialogData();
  }

  openEditClassDialog(classItem: Class) {
    this.selectedClass.set(classItem);
    this.editedClassName.set(classItem.name);
    this.displayEditClassDialog.set(true);
  }

  async saveClass() {
    const name = this.newClassName().trim();
    if (!name) {
      this.messageService.add({ severity: 'warn', summary: 'Hiányzó adat', detail: 'Add meg az osztály nevét.' });
      return;
    }

    try {
      await firstValueFrom(this.classService.createClass({ name }));
      this.displayAddClassDialog.set(false);
      this.newClassName.set('');
      this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Osztály létrehozva.' });
      await this.loadClasses();
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Hiba', detail: this.getErrorMessage(error) });
    }
  }

  async saveEditedClass() {
    const selected = this.selectedClass();
    const name = this.editedClassName().trim();

    if (!selected) {
      return;
    }

    if (!name) {
      this.messageService.add({ severity: 'warn', summary: 'Hiányzó adat', detail: 'Add meg az osztály nevét.' });
      return;
    }

    try {
      await firstValueFrom(this.classService.renameClass(selected.id, { name }));
      this.displayEditClassDialog.set(false);
      this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Osztály átnevezve.' });
      await this.loadClasses();
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Hiba', detail: this.getErrorMessage(error) });
    }
  }

  async deleteClass(classItem: Class) {
    const ok = window.confirm(`Biztosan törlöd a(z) ${classItem.name} osztályt?`);
    if (!ok) {
      return;
    }

    try {
      await firstValueFrom(this.classService.deleteClass(classItem.id));
      this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Osztály törölve.' });
      await this.loadClasses();
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Hiba', detail: this.getErrorMessage(error) });
    }
  }

  async enrollSelectedStudent() {
    const selected = this.selectedClass();
    const studentId = this.selectedFreeStudentId();

    if (!selected || !studentId) {
      this.messageService.add({ severity: 'warn', summary: 'Hiányzó adat', detail: 'Válassz diákot.' });
      return;
    }

    try {
      await firstValueFrom(this.classService.enrollStudent(selected.id, { student_id: studentId }));
      this.selectedFreeStudentId.set('');
      this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Diák hozzáadva az osztályhoz.' });
      await this.loadStudentsDialogData();
      await this.loadClasses();
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Hiba', detail: this.getErrorMessage(error) });
    }
  }

  async removeStudent(studentId: string) {
    const selected = this.selectedClass();
    if (!selected) {
      return;
    }

    try {
      await firstValueFrom(this.classService.removeStudentFromClass(selected.id, studentId));
      this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Diák eltávolítva az osztályból.' });
      await this.loadStudentsDialogData();
      await this.loadClasses();
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Hiba', detail: this.getErrorMessage(error) });
    }
  }

  private async loadClasses() {
    this.loading.set(true);
    try {
      const classes = await firstValueFrom(this.classService.getClasses());
      const withCounts = await Promise.all(classes.map((classItem) => this.toClassView(classItem)));
      this.classes.set(withCounts);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Hiba', detail: this.getErrorMessage(error) });
    } finally {
      this.loading.set(false);
    }
  }

  private async toClassView(classItem: ClassDto): Promise<Class> {
    try {
      const students = await firstValueFrom(this.classService.getClassStudents(classItem.id));
      return {
        id: classItem.id,
        name: classItem.name,
        grade: this.extractGrade(classItem.name),
        studentCount: students.length,
      };
    } catch {
      return {
        id: classItem.id,
        name: classItem.name,
        grade: this.extractGrade(classItem.name),
        studentCount: 0,
      };
    }
  }

  private async loadStudentsDialogData() {
    const selected = this.selectedClass();
    if (!selected) {
      return;
    }

    try {
      const [classStudents, freeStudents] = await Promise.all([
        firstValueFrom(this.classService.getClassStudents(selected.id)),
        firstValueFrom(this.classService.getFreeStudents()),
      ]);
      this.classStudents.set(classStudents);
      this.freeStudents.set(freeStudents);
      this.freeStudentOptions.set(
        freeStudents.map((student) => ({
          label: student.User
            ? `${student.User.full_name} (@${student.User.username})`
            : `${student.user_id} (${student.id})`,
          value: student.id,
        }))
      );
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Hiba', detail: this.getErrorMessage(error) });
    }
  }

  private extractGrade(className: string): string {
    const match = className.match(/^(\d{1,2})/);
    return match ? match[1] : '-';
  }

  private getErrorMessage(error: any): string {
    return (
      error?.error?.error ||
      error?.error?.message ||
      'Váratlan hiba történt.'
    );
  }
}
