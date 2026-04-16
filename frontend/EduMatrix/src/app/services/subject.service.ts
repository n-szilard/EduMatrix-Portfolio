import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface SubjectDto {
  id: string;
  name: string;
}

export interface CreateSubjectPayload {
  name: string;
}

export interface UpdateSubjectPayload {
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubjectService {
  private readonly apiBaseUrl = 'http://localhost:4000/api';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  getSubjects(): Observable<SubjectDto[]> {
    return this.http.get<SubjectDto[]>(`${this.apiBaseUrl}/subjects`, {
      headers: this.authHeaders(),
    });
  }

  createSubject(payload: CreateSubjectPayload): Observable<SubjectDto> {
    return this.http.post<SubjectDto>(`${this.apiBaseUrl}/subjects`, payload, {
      headers: this.authHeaders(),
    });
  }

  updateSubject(subjectId: string, payload: UpdateSubjectPayload): Observable<SubjectDto> {
    return this.http.patch<SubjectDto>(`${this.apiBaseUrl}/subjects/${encodeURIComponent(subjectId)}`, payload, {
      headers: this.authHeaders(),
    });
  }

  deleteSubject(subjectId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/subjects/${encodeURIComponent(subjectId)}`, {
      headers: this.authHeaders(),
    });
  }
}
