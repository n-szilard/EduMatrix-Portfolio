import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';

import { NotesService, NoteCategory, NoteDto } from '../../../services/notes.service';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  date: string;
  created_at: string;
  author: string;
}

@Component({
  selector: 'app-student-notes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    CardModule,
    TooltipModule,
    DialogModule,
  ],
  templateUrl: './student-notes.component.html',
  styleUrl: './student-notes.component.scss',
})
export class StudentNotesComponent implements OnInit {
  constructor(private notesService: NotesService) {}

  ngOnInit(): void {
    void this.loadNotes();
  }

  // UI state
  searchTerm = signal('');
  activeFilter = signal<string>('Összes');
  loading = signal(false);
  loadError = signal<string | null>(null);

  filters = ['Összes', 'Tanulmányi', 'Személyes', 'Emlékeztető'];

  // advanced filters
  filtersDialogVisible = signal(false);
  filterAuthor = signal('');
  filterFrom = signal<string>('');
  filterTo = signal<string>('');

  notes = signal<Note[]>([]);

  filteredNotes = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const cat = this.activeFilter();

    const authorTerm = this.filterAuthor().trim().toLowerCase();
    const from = this.filterFrom().trim();
    const to = this.filterTo().trim();

    const fromDate = from ? new Date(from + 'T00:00:00') : null;
    const toDate = to ? new Date(to + 'T23:59:59') : null;

    return this.notes().filter(
      (n) =>
        (cat === 'Összes' || n.category === cat) &&
        (n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term)) &&
        (!authorTerm || (n.author || '').toLowerCase().includes(authorTerm)) &&
        (!fromDate || new Date(n.created_at) >= fromDate) &&
        (!toDate || new Date(n.created_at) <= toDate)
    );
  });

  setFilter(f: string) {
    this.activeFilter.set(f);
  }

  categorySeverity(cat: string): 'info' | 'secondary' | 'warn' {
    if (cat === 'Tanulmányi') return 'info';
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

  reloadNotes() {
    void this.loadNotes();
  }

  private async loadNotes(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      // backend already scopes notes to the logged-in student (student_id = current student)
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
}
