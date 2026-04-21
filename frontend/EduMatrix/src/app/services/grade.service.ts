import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface GradeItemDto {
  id: string;
  grade: number;
  date: string; // YYYY-MM-DD
  subject: {
    id: string | null;
    name: string;
  };
  class: {
    id: string | null;
    name: string | null;
  };
}

export interface CreateGradePayload {
  student_id: string;
  class_subject_id: string;
  grade: number;
  date: string; // YYYY-MM-DD
}

export interface GradebookStudentDto {
  id: string;
  class_id: string | null;
  full_name: string | null;
}

export interface GradebookDto {
  classSubject: {
    id: string;
    class: { id: string | null; name: string | null };
    subject: { id: string | null; name: string | null };
  };
  students: GradebookStudentDto[];
  gradesByStudentId: Record<string, GradeItemDto[]>;
}

@Injectable({
  providedIn: 'root',
})
export class GradeService {
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

  getMyGrades(): Observable<GradeItemDto[]> {
    return this.http.get<GradeItemDto[]>(`${this.apiBaseUrl}/grades/me`, {
      headers: this.authHeaders(),
    });
  }

  getStudentGrades(studentId: string): Observable<GradeItemDto[]> {
    return this.http.get<GradeItemDto[]>(`${this.apiBaseUrl}/grades/student/${encodeURIComponent(studentId)}`, {
      headers: this.authHeaders(),
    });
  }

  createGrade(payload: CreateGradePayload): Observable<GradeItemDto> {
    return this.http.post<GradeItemDto>(`${this.apiBaseUrl}/grades`, payload, {
      headers: this.authHeaders(),
    });
  }

  getGradebook(classSubjectId: string): Observable<GradebookDto> {
    return this.http.get<GradebookDto>(
      `${this.apiBaseUrl}/grades/gradebook/${encodeURIComponent(classSubjectId)}`,
      { headers: this.authHeaders() }
    );
  }
}
