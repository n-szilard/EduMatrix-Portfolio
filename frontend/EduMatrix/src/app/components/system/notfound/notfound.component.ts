import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-notfound',
  imports: [
        CommonModule,
    RouterModule,
    ButtonModule,
    CardModule
  ],
  templateUrl: './notfound.component.html',
  styleUrl: './notfound.component.scss'
})
export class NotfoundComponent {
  constructor(private router: Router) {}

  backhome() {
    this.router.navigate(['/']);
  }
}
