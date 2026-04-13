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
  vezeteknev = 'Tung';
  keresztnev = 'Sahur';
  email = 'tung.tung.sahur@edumatrix.hu';
  telefon = '+36 30 123 4567';

  jelenlegiJelszo = '';
  ujJelszo = '';
  ujJelszoMegerosites = '';

  constructor(private messageService: MessageService) {}

  mentesek(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Sikeres mentés',
      detail: 'Minden módosítás sikeresen mentve!',
      life: 3000,
    });
  }

  megse(): void {
    this.vezeteknev = 'Tung';
    this.keresztnev = 'Sahur';
    this.email = 'tung.tung.sahur@edumatrix.hu';
    this.telefon = '+36 30 123 4567';
    this.jelenlegiJelszo = '';
    this.ujJelszo = '';
    this.ujJelszoMegerosites = '';
  }
}