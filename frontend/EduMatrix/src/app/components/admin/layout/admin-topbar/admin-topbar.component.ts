import { Component, Input } from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// PrimeNG
import { DividerModule } from 'primeng/divider';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DividerModule,
    ButtonModule,
    AvatarModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    TooltipModule,
  ],
  templateUrl: './admin-topbar.component.html',
  styleUrls: ['./admin-topbar.component.scss'],
})
export class AdminTopbarComponent {
  /** Bal oldali fő cím (pl. „Felhasználók”, „Áttekintés”) */
  @Input({ required: true }) title!: string;

  /** Opcionális: keresőmező megjelenítése bal oldalon */
  @Input() showSearch = false;
  @Input() searchPlaceholder = 'Keresés...';

  /** Jobb oldali gyorsműveletek (értesítések/üzenetek) */
  @Input() showActions = false;

  /** Jobb oldali felhasználó-információ */
  @Input() userName = 'PLACEHOLDER';
  @Input() userRoleLabel = 'Adminisztrátor';

  /** Opcionális avatar kép; ha nincs megadva, nem jelenik meg avatar */
  @Input() avatarImage?: string;
}
