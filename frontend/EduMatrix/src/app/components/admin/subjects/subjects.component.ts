import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';

import { AdminSidebarComponent } from '../layout/admin-sidebar/admin-sidebar.component';
import { AdminTopbarComponent } from '../layout/admin-topbar/admin-topbar.component';
import { AuthService } from '../../../services/auth.service';
import { ClassSubjectService } from '../../../services/class-subject.service';
import { SubjectDto, SubjectService } from '../../../services/subject.service';

interface SubjectRow extends SubjectDto {
  assignmentCount: number;
}

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    BadgeModule,
    DialogModule,
    InputTextModule,
    TableModule,
    ToastModule,
    TagModule,
    TooltipModule,
    IconFieldModule,
    InputIconModule,
    AdminSidebarComponent,
    AdminTopbarComponent,
  ],
  providers: [MessageService],
  templateUrl: './subjects.component.html',
  styleUrl: './subjects.component.scss',
})
export class SubjectsComponent implements OnInit {
  adminName = signal<string>('Admin');
  loading = signal(false);
  dialogVisible = signal(false);
  isEditMode = signal(false);
  editingSubjectId = signal<string | null>(null);
  subjectName = signal('');
  subjects = signal<SubjectRow[]>([]);
  classSubjectCountBySubject = signal<Record<string, number>>({});

  navLinks = [
    { icon: 'pi pi-home', label: 'Vezérlőpult', routerLink: ['/admin/dashboard'] },
    { icon: 'pi pi-users', label: 'Felhasználók', routerLink: ['/admin/users'] },
    { icon: 'pi pi-sitemap', label: 'Osztályok', routerLink: ['/admin/classes'] },
    { icon: 'pi pi-book', label: 'Tantárgyak', routerLink: ['/admin/subjects'] },
    { icon: 'pi pi-table', label: 'Hozzárendelések', routerLink: ['/admin/class-subjects'] },
    { icon: 'pi pi-calendar', label: 'Órarend', routerLink: ['/admin/timetable'] },
  ];

  totalSubjects = computed(() => this.subjects().length);
  assignedSubjects = computed(() => this.subjects().filter((subject) => subject.assignmentCount > 0).length);
  unassignedSubjects = computed(() => this.subjects().filter((subject) => subject.assignmentCount === 0).length);

  constructor(
    private authService: AuthService,
    private messageService: MessageService,
    private subjectService: SubjectService,
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
    this.editingSubjectId.set(null);
    this.subjectName.set('');
    this.dialogVisible.set(true);
  }

  openEditDialog(subject: SubjectRow): void {
    this.isEditMode.set(true);
    this.editingSubjectId.set(subject.id);
    this.subjectName.set(subject.name);
    this.dialogVisible.set(true);
  }

  async saveSubject(): Promise<void> {
    const name = this.subjectName().trim();
    if (!name) {
      this.messageService.add({ severity: 'warn', summary: 'Hiányzó adat', detail: 'Add meg a tantárgy nevét.' });
      return;
    }

    try {
      if (this.isEditMode() && this.editingSubjectId()) {
        await firstValueFrom(this.subjectService.updateSubject(this.editingSubjectId() as string, { name }));
        this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Tantárgy módosítva.' });
      } else {
        await firstValueFrom(this.subjectService.createSubject({ name }));
        this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Tantárgy létrehozva.' });
      }

      this.dialogVisible.set(false);
      await this.loadData();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Hiba',
        detail: error?.error?.message || 'Nem sikerült menteni a tantárgyat.',
      });
    }
  }

  async deleteSubject(subject: SubjectRow): Promise<void> {
    const ok = window.confirm(`Biztosan törlöd a(z) ${subject.name} tantárgyat?`);
    if (!ok) {
      return;
    }

    try {
      await firstValueFrom(this.subjectService.deleteSubject(subject.id));
      this.messageService.add({ severity: 'success', summary: 'Siker', detail: 'Tantárgy törölve.' });
      await this.loadData();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Hiba',
        detail: error?.error?.message || 'Nem sikerült törölni a tantárgyat.',
      });
    }
  }

  private async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const [subjects, classSubjects] = await Promise.all([
        firstValueFrom(this.subjectService.getSubjects()),
        firstValueFrom(this.classSubjectService.getClassSubjects()),
      ]);

      const counts: Record<string, number> = {};
      classSubjects.forEach((row) => {
        counts[row.subject_id] = (counts[row.subject_id] || 0) + 1;
      });
      this.classSubjectCountBySubject.set(counts);

      this.subjects.set(
        subjects.map((subject) => ({
          ...subject,
          assignmentCount: counts[subject.id] || 0,
        }))
      );
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Hiba',
        detail: error?.error?.message || 'Nem sikerült betölteni a tantárgyakat.',
      });
    } finally {
      this.loading.set(false);
    }
  }
}
