import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CheckboxModule,
    CardModule,
    MessageModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  loginForm: FormGroup;
  errorMessage: string = '';
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      remember: [false]
    });
  }

  login() {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Kérjük töltse ki az összes mezőt.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { username, password, remember } = this.loginForm.value;

    this.authService.login(username, password, !!remember)
      .subscribe({
        next: () => {
          const role = this.authService.getRole();
          if (role === 'admin') {
            this.router.navigate(['/admin/dashboard']);
            return;
          }
          if (role === 'pending') {
            this.router.navigate(['/pending']);
            return;
          }
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Bejelentkezési hiba.';
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        }
      });
  }
}