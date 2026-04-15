import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
  PasswordModule,
    ButtonModule,
    ToastModule,
    TagModule,
    AvatarModule,
    DividerModule,
  ],
  providers: [MessageService],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  // Profil oldal
  constructor(
    private messageService: MessageService,
    private authService: AuthService,
    private userService: UserService
  ) {
    // User betöltés
    const user = this.authService.getUser();

    this.email = user?.email ?? '';
    this.username = user?.username ?? '';

    // Név bontás
    const fullName = user?.full_name ?? '';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    this.vezeteknev = parts[0] ?? '';
    this.keresztnev = parts.slice(1).join(' ') ?? '';

    this.role = this.authService.getRole() ?? '';
  }

  // Profil mezők
  vezeteknev = '';
  keresztnev = '';
  email = '';
  username = '';
  role = '';

  jelenlegiJelszo = '';
  ujJelszo = '';
  ujJelszoMegerosites = '';

  get passwordMismatch(): boolean {
    return Boolean(this.ujJelszo && this.ujJelszoMegerosites && this.ujJelszo !== this.ujJelszoMegerosites);
  }

  get passwordTooShort(): boolean {
    return Boolean(this.ujJelszo && this.ujJelszo.length < 8);
  }

  private resetPasswordForm(): void {
    this.jelenlegiJelszo = '';
    this.ujJelszo = '';
    this.ujJelszoMegerosites = '';
  }

  mentesek(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Sikeres mentés',
      detail: 'Minden módosítás sikeresen mentve!',
      life: 3000,
    });
  }

  jelszoModositas(): void {
    if (!this.jelenlegiJelszo || !this.ujJelszo || !this.ujJelszoMegerosites) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Hiányzó adatok',
        detail: 'Töltsd ki az összes jelszó mezőt.',
        life: 3000,
      });
      return;
    }

    if (this.passwordTooShort) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Gyenge jelszó',
        detail: 'Az új jelszónak legalább 8 karakter hosszúnak kell lennie.',
        life: 3500,
      });
      return;
    }

    if (this.passwordMismatch) {
      this.messageService.add({
        severity: 'error',
        summary: 'Nem egyezik',
        detail: 'Az új jelszó és a megerősítés nem egyezik.',
        life: 3500,
      });
      return;
    }

  // API
    this.userService.changePassword({
      currentPassword: this.jelenlegiJelszo,
      newPassword: this.ujJelszo,
    }).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Siker',
          detail: res?.message || 'Jelszó sikeresen módosítva.',
          life: 3000,
        });
        this.resetPasswordForm();
      },
      error: (err) => {
  // Backend hiba
        const msg = err?.error?.message
          || (Array.isArray(err?.error?.errors) ? err.error.errors.map((e: any) => e.msg).join(' ') : null)
          || 'Nem sikerült módosítani a jelszót.';
        this.messageService.add({
          severity: 'error',
          summary: 'Hiba',
          detail: msg,
          life: 4000,
        });
      }
    });
  }

  megse(): void {
    const user = this.authService.getUser();
    this.email = user?.email ?? '';
    this.username = user?.username ?? '';

    const fullName = user?.full_name ?? '';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    this.vezeteknev = parts[0] ?? '';
    this.keresztnev = parts.slice(1).join(' ') ?? '';

    this.role = this.authService.getRole() ?? '';

    this.resetPasswordForm();
  }
}