import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logout',
  imports: [],
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss'
})
export class LogoutComponent implements OnInit {

  constructor(private router: Router) {}

  ngOnInit(): void {
    // localStorage-ből törlés
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Átirányítás az főoldalra
    this.router.navigate(['/']);
  }
}
