import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { catchError, map, switchMap } from 'rxjs/operators';

export interface ClassDto {
  id: string;
  name: string;
}

export interface StudentDto {
  id: string;
  user_id: string;
  class_id: string | null;
  User?: {
    id: string;
    full_name: string;
    username: string;
    email: string;
  };
  Class?: {
    id: string;
    name: string;
  };
}

export interface CreateClassPayload {
  name: string;
}

export interface RenameClassPayload {
  name: string;
}

export interface EnrollStudentPayload {
  student_id?: string;
  studentId?: string;
}

export interface EnrollResponse {
  message: string;
  student: StudentDto;
}

@Injectable({
  providedIn: 'root'
})
export class ClassService {

  // Backend API alap URL
  private readonly apiBaseUrl = 'http://localhost:4000/api';

  constructor(private http: HttpClient, private authService: AuthService) { }

  // Auth fejléc tokennel
  private authHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Összes osztály
  getClasses(): Observable<ClassDto[]> {
    return this.http.get<ClassDto[]>(`${this.apiBaseUrl}/classes`, {
      headers: this.authHeaders(),
    });
  }

  // Egy osztály adatai
  getClassById(classId: string): Observable<ClassDto> {
    return this.http.get<ClassDto>(`${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}`, {
      headers: this.authHeaders(),
    });
  }

  // Új osztály létrehozása
  createClass(payload: CreateClassPayload): Observable<ClassDto> {
    return this.http.post<ClassDto>(`${this.apiBaseUrl}/classes`, payload, {
      headers: this.authHeaders(),
    });
  }

  // Osztály átnevezése
  renameClass(classId: string, payload: RenameClassPayload): Observable<ClassDto> {
    return this.http.put<ClassDto>(`${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}`, payload, {
      headers: this.authHeaders(),
    });
  }

  // Üres osztály törlése
  deleteClass(classId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}`, {
      headers: this.authHeaders(),
    });
  }

  // Osztály diákjai
  getClassStudents(classId: string): Observable<StudentDto[]> {
    return this.http.get<StudentDto[]>(`${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}/students`, {
      headers: this.authHeaders(),
    });
  }

  // Összes diák
  getAllStudents(): Observable<StudentDto[]> {
    return this.http.get<StudentDto[]>(`${this.apiBaseUrl}/classes/students`, {
      headers: this.authHeaders(),
    }).pipe(
      catchError((err) => {
        if (err?.status !== 404) {
          return throwError(() => err);
        }

        return this.getAllStudentsFallback();
      })
    );
  }

  private getAllStudentsFallback(): Observable<StudentDto[]> {
    return this.getClasses().pipe(
      switchMap((classes) => {
        const byClass$ = (classes ?? []).map((c) =>
          this.getClassStudents(c.id).pipe(
            catchError(() => of([])),
            map((students) => (students ?? []).map((s) => ({
              ...s,
              Class: { id: c.id, name: c.name },
            })))
          )
        );

        return forkJoin([
          this.getFreeStudents().pipe(catchError(() => of([]))),
          ...(byClass$.length ? byClass$ : [of([])]),
        ]).pipe(
          map((groups) => this.dedupeStudents(groups.flat()))
        );
      })
    );
  }

  private dedupeStudents(list: StudentDto[]): StudentDto[] {
    const byId = new Map<string, StudentDto>();

    for (const s of list) {
      const prev = byId.get(s.id);
      if (!prev) {
        byId.set(s.id, s);
        continue;
      }
      byId.set(s.id, {
        ...prev,
        ...s,
        User: s.User ?? prev.User,
        Class: s.Class ?? prev.Class,
      });
    }

    return Array.from(byId.values());
  }

  // Osztály nélküli diákok
  getFreeStudents(): Observable<StudentDto[]> {
    return this.http.get<StudentDto[]>(`${this.apiBaseUrl}/classes/students/free`, {
      headers: this.authHeaders(),
    });
  }

  // Diák hozzárendelése
  enrollStudent(classId: string, payload: EnrollStudentPayload): Observable<EnrollResponse> {
    return this.http.post<EnrollResponse>(`${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}/enroll`, payload, {
      headers: this.authHeaders(),
    });
  }

  // Diák áthelyezése
  moveStudentToClass(classId: string, studentId: string): Observable<EnrollResponse> {
    return this.http.put<EnrollResponse>(
      `${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}/enroll/${encodeURIComponent(studentId)}`,
      {},
      { headers: this.authHeaders() }
    );
  }

  // Diák kivétele osztályból
  removeStudentFromClass(classId: string, studentId: string): Observable<EnrollResponse> {
    return this.http.delete<EnrollResponse>(
      `${this.apiBaseUrl}/classes/${encodeURIComponent(classId)}/enroll/${encodeURIComponent(studentId)}`,
      { headers: this.authHeaders() }
    );
  }
}
