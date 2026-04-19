import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { TextareaModule } from 'primeng/textarea';

import { NotesService, NoteCategory, NoteDto } from '../../../services/notes.service';
import { ClassService, StudentDto } from '../../../services/class.service';
import { AuthService } from '../../../services/auth.service';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  date: string;
  created_at: string;
  author: string;
  student_id: string | null;
}

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, TagModule,
    CardModule, DividerModule, TooltipModule,
    DialogModule, DropdownModule, TextareaModule
  ],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.scss'
})
export class NotesComponent implements OnInit {
  constructor(
    private notesService: NotesService,
    private classService: ClassService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    void this.loadNotes();
    if (this.canCreate()) void this.loadStudents();
  }

  canCreate(): boolean {
    const role = this.authService.getRole();
    return role === 'teacher' || role === 'admin';
  }

  searchTerm = signal('');
  activeFilter = signal<string>('Összes');
  loading = signal(false);
  loadError = signal<string | null>(null);

  filters = ['Összes', 'Tanulmányi', 'Személyes', 'Emlékeztető'];

  // filters
  filtersDialogVisible = signal(false);
  filterAuthor = signal('');
  filterFrom = signal<string>(''); 
  filterTo = signal<string>('');   

  // Create/Edit
  noteDialogVisible = signal(false);
  editingNoteId = signal<string | null>(null);
  draftTitle = signal('');
  draftCategory = signal<NoteCategory>('Tanulmányi');
  draftContent = signal('');
  draftStudentId = signal<string | null>(null);

  studentsLoading = signal(false);
  students = signal<StudentDto[]>([]);

  private async loadStudents(): Promise<void> {
    this.studentsLoading.set(true);
    try {
      const list = await firstValueFrom(this.classService.getAllStudents());
      this.students.set(list ?? []);
    } catch {
      this.students.set([]);
    } finally {
      this.studentsLoading.set(false);
    }
  }

  reloadStudents() {
    if (!this.canCreate()) return;
    void this.loadStudents();
  }

  studentOptions = computed(() => {
    return this.students().map(s => {
      const shortId = (s.User?.id || s.user_id || s.id || '').slice(0, 8);
      const name = s.User?.full_name ?? `Diák ${shortId}`;
      const className = s.Class?.name ? ` (${s.Class.name})` : '';
      return { label: `${name}${className}`, value: s.id };
    });
  });

  categoryOptions = [
    { label: 'Tanulmányi', value: 'Tanulmányi' as NoteCategory },
    { label: 'Személyes', value: 'Személyes' as NoteCategory },
    { label: 'Emlékeztető', value: 'Emlékeztető' as NoteCategory },
  ];

  notes = signal<Note[]>([]);

  filteredNotes = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const cat  = this.activeFilter();

    const authorTerm = this.filterAuthor().trim().toLowerCase();
    const from = this.filterFrom().trim();
    const to = this.filterTo().trim();

    const fromDate = from ? new Date(from + 'T00:00:00') : null;
    const toDate = to ? new Date(to + 'T23:59:59') : null;

    return this.notes().filter(n =>
      (cat === 'Összes' || n.category === cat) &&
      (n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term)) &&
      (!authorTerm || (n.author || '').toLowerCase().includes(authorTerm)) &&
      (!fromDate || new Date(n.created_at) >= fromDate) &&
      (!toDate || new Date(n.created_at) <= toDate)
    );
  });

  setFilter(f: string) { this.activeFilter.set(f); }

  categorySeverity(cat: string): 'info' | 'secondary' | 'warn' {
    if (cat === 'Tanulmányi')  return 'info';
    if (cat === 'Emlékeztető') return 'secondary';
    return 'warn';
  }

  openFiltersDialog() {
    this.filtersDialogVisible.set(true);
  }

  clearAdvancedFilters() {
    this.filterAuthor.set('');
    this.filterFrom.set('');
    this.filterTo.set('');
  }

  openNewNoteDialog() {
    if (!this.canCreate()) return;
    this.reloadStudents();
    this.editingNoteId.set(null);
    this.draftTitle.set('');
    this.draftCategory.set('Tanulmányi');
    this.draftContent.set('');
    this.draftStudentId.set(null);
    this.noteDialogVisible.set(true);
  }

  openEditDialog(note: Note) {
    if (!this.canCreate()) return;
    this.editingNoteId.set(note.id);
    this.draftTitle.set(note.title);
    this.draftCategory.set(note.category);
    this.draftContent.set(note.content);
    this.draftStudentId.set(note.student_id);
    this.noteDialogVisible.set(true);
  }

  reloadNotes() {
    void this.loadNotes();
  }

  private async loadNotes(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      const list = await firstValueFrom(this.notesService.getNotes());
      this.notes.set((list ?? []).map((n) => this.toNoteView(n)));
    } catch (err: any) {
      this.loadError.set(err?.error?.message || 'Nem sikerült betölteni a feljegyzéseket.');
    } finally {
      this.loading.set(false);
    }
  }

  private toNoteView(dto: NoteDto): Note {
    return {
      id: dto.id,
      title: dto.title,
      content: dto.content,
      category: dto.category,
      created_at: dto.created_at,
      date: this.formatDateHu(dto.created_at),
      author: dto.author ?? 'Ismeretlen',
      student_id: dto.student_id ?? null,
    };
  }

  private formatDateHu(iso: string): string {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      }).format(d);
    } catch {
      return iso;
    }
  }

  async saveDraft(): Promise<void> {
    if (!this.canCreate()) return;
    const title = this.draftTitle().trim();
    const content = this.draftContent().trim();
    const category = this.draftCategory();
    const studentId = this.draftStudentId();

    if (!title || !content) return;

    const editingId = this.editingNoteId();

    try {
      if (!editingId) {
        if (!studentId) return;
        const created = await firstValueFrom(
          this.notesService.createNote({ title, content, category, student_id: studentId })
        );
        this.notes.update((list) => [this.toNoteView(created), ...list]);
        this.noteDialogVisible.set(false);
        return;
      }

      const updated = await firstValueFrom(this.notesService.updateNote(editingId, { title, content, category }));
      const view = this.toNoteView(updated);
      this.notes.update((list) => list.map((n) => (n.id === view.id ? view : n)));
      this.noteDialogVisible.set(false);
    } catch {
    }
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.canCreate()) return;
    try {
      await firstValueFrom(this.notesService.deleteNote(id));
      this.notes.update((list) => list.filter((n) => n.id !== id));
    } catch {
    }
  }
}