import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export type NoteCategory = 'Tanulmányi' | 'Személyes' | 'Emlékeztető';

export interface NoteDto {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  created_at: string;
  author: string | null;
  teacher_id: string;
  student_id: string | null;
}

export interface NotesQuery {
  q?: string;
  category?: string; 
  from?: string; 
  to?: string;   
}

export interface CreateNotePayload {
  title: string;
  category: NoteCategory;
  content: string;
  student_id: string;
}

export interface UpdateNotePayload {
  title?: string;
  category?: NoteCategory;
  content?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  private readonly apiBaseUrl = 'http://localhost:4000/api';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  getNotes(query: NotesQuery = {}): Observable<NoteDto[]> {
    let params = new HttpParams();
    if (query.q) params = params.set('q', query.q);
    if (query.category) params = params.set('category', query.category);
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);

    return this.http.get<NoteDto[]>(`${this.apiBaseUrl}/notes`, {
      headers: this.authHeaders(),
      params,
    });
  }

  createNote(payload: CreateNotePayload): Observable<NoteDto> {
    return this.http.post<NoteDto>(`${this.apiBaseUrl}/notes`, payload, {
      headers: this.authHeaders(),
    });
  }

  updateNote(id: string, payload: UpdateNotePayload): Observable<NoteDto> {
    return this.http.put<NoteDto>(`${this.apiBaseUrl}/notes/${encodeURIComponent(id)}`, payload, {
      headers: this.authHeaders(),
    });
  }

  deleteNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/notes/${encodeURIComponent(id)}`, {
      headers: this.authHeaders(),
    });
  }
}
