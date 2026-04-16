import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface ClassSubjectDto {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  Class?: {
    id: string;
    name: string;
  };
  Subject?: {
    id: string;
    name: string;
  };
  Teacher?: {
    id: string;
    user_id: string;
    User?: {
      id: string;
      username: string;
      full_name: string;
      email: string;
    };
  };
}

export interface CreateClassSubjectPayload {
  class_id: string;
  subject_id: string;
  teacher_id: string;
}

export interface UpdateClassSubjectPayload {
  class_id?: string;
  subject_id?: string;
  teacher_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClassSubjectService {
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

  getClassSubjects(): Observable<ClassSubjectDto[]> {
    return this.http.get<ClassSubjectDto[]>(`${this.apiBaseUrl}/class-subjects`, {
      headers: this.authHeaders(),
    });
  }

  createClassSubject(payload: CreateClassSubjectPayload): Observable<ClassSubjectDto> {
    return this.http.post<ClassSubjectDto>(`${this.apiBaseUrl}/class-subjects`, payload, {
      headers: this.authHeaders(),
    });
  }

  updateClassSubject(classSubjectId: string, payload: UpdateClassSubjectPayload): Observable<ClassSubjectDto> {
    return this.http.patch<ClassSubjectDto>(`${this.apiBaseUrl}/class-subjects/${encodeURIComponent(classSubjectId)}`, payload, {
      headers: this.authHeaders(),
    });
  }

  deleteClassSubject(classSubjectId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/class-subjects/${encodeURIComponent(classSubjectId)}`, {
      headers: this.authHeaders(),
    });
  }
}
