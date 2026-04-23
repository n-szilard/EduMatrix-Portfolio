import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface MailDto {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface MailResponseDto {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class MailService {
  private readonly apiBaseUrl = 'http://localhost:4000/api';

  constructor(private http: HttpClient) { }

  sendMail(payload: MailDto): Observable<MailResponseDto> {
    return this.http.post<MailResponseDto>(`${this.apiBaseUrl}/mail/contact`, payload);
  }
}
