import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { MailDto, MailResponseDto, MailService } from '../../../services/mail.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    HeaderComponent,
    FooterComponent,
    ToastModule
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  providers: [MessageService]
})
export class ContactComponent {
  isSending = false;

  mailDto: MailDto = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  constructor(private mailService: MailService, private messageService: MessageService) { }

  sendMail(): void {
    if (this.isSending) {
      return;
    }

    this.isSending = true;

    this.mailService.sendMail(this.mailDto).pipe(
      finalize(() => {
        this.isSending = false;
      })
    ).subscribe({
      next: (response: MailResponseDto) => {
        if (response.success) {
          this.messageService.add({ severity: 'success', summary: 'Siker', detail: response.message });
          this.mailDto = { name: '', email: '', subject: '', message: '' };
          return;
        }

        this.messageService.add({ severity: 'error', summary: 'Hiba', detail: response.message });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Hiba',
          detail: 'Hiba történt az üzenet elküldésekor. Kérlek próbáld újra később.'
        });
      }
    });
  }

}
