import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    HttpClientModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    SelectModule,
    ButtonModule,
    CardModule,
    MessageModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  registerForm!: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  loading: boolean = false;

  roles: { label: string; value: string }[] = [
    { label: 'Adminisztrátor', value: 'admin' },
    { label: 'Tanár', value: 'teacher' },
    { label: 'Tanuló', value: 'student' },
    { label: 'Szülő', value: 'parent' }
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      role: ['', Validators.required],
      acceptTerms: [false]
    });
  }

  get passwordMismatch(): boolean {
    const p = this.registerForm.get('password')?.value;
    const cp = this.registerForm.get('confirmPassword')?.value;
    const cpTouched = this.registerForm.get('confirmPassword')?.touched ?? false;
    return cpTouched && p !== cp && cp !== '';
  }
  register(): void {
    const p = this.registerForm.get('password')?.value;
    const cp = this.registerForm.get('confirmPassword')?.value;

    if (p !== cp) {
      this.errorMessage = 'A jelszavak nem egyeznek.';
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Kérjük töltse ki az összes mezőt.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { firstName, lastName, email, username, password, role } = this.registerForm.value;

    this.http.post<any>('http://localhost:4000/api/users/register', {
      firstName, lastName, email, username, password, role
    }).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.successMessage = 'Sikeres regisztráció! Átirányítás...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Regisztrációs hiba.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}