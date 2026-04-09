import { Component, OnInit, signal, computed } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { AvatarModule } from 'primeng/avatar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { PasswordModule } from 'primeng/password';
import { ConfirmationService, MessageService } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';

import { AdminSidebarComponent } from '../layout/admin-sidebar/admin-sidebar.component';
import { AdminTopbarComponent } from '../layout/admin-topbar/admin-topbar.component';

import {
  UserService,
  RoleDto,
  RoleName,
  UserDto,
  CreateUserPayload,
  UpdateUserPayload,
} from '../../../services/user.service';

// Modellek (a DB sémádhoz igazítva)

export interface Role {
  id: string;
  name: RoleName;
}

export interface User {
  id: string;
  username: string;
  password_hash: string;
  email: string;
  role: RoleName;
  // Csatolt / számított mezők
  full_name?: string;  // a userből / csatolt táblából (tanuló/tanár profil)
  class_name?: string; // osztály neve (csak tanulóknál)
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
  AdminSidebarComponent,
  AdminTopbarComponent,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    ConfirmDialogModule,
    DropdownModule,
    SelectModule,
    InputTextModule,
    TagModule,
    ToastModule,
    ToolbarModule,
    AvatarModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    DividerModule,
    PasswordModule,
    BadgeModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {

  // Állapot
  // Sidebar navigáció
  navLinks = [
  { icon: 'pi pi-home',  label: 'Vezérlőpult',  routerLink: ['/admin/dashboard'] },
  { icon: 'pi pi-users', label: 'Felhasználók', routerLink: ['/admin/users'] },
  { icon: 'pi pi-sitemap', label: 'Osztályok', routerLink: ['/admin/classes'] },
  ];

  roles = signal<Role[]>([]);
  users = signal<User[]>([]);
  globalFilter = signal('');
  dialogVisible = signal(false);
  isEditMode = signal(false);
  submitting = signal(false);
  adminName = signal<string>('Admin');

  // Származtatott értékek
  // A gyors szerepkör-váltó dropdown ne engedje visszaállítani „függőben”-re.
  roleOptions = computed(() =>
    this.roles()
      .filter(r => r.name !== 'pending')
      .map(r => ({ label: this.roleLabelMap[r.name], value: r.name, name: r.name }))
  );

  roleLabelMap: Record<RoleName, string> = {
    admin:   'Admin',
  teacher: 'Tanár',
  student: 'Tanuló',
  parent:  'Szülő',
  pending: 'Függőben',
  };

  roleSeverityMap: Record<RoleName, string> = {
    admin:   'danger',
    teacher: 'info',
    student: 'success',
    parent:  'warn',
  pending: 'secondary',
  };

  roleIconMap: Record<RoleName, string> = {
    admin:   'pi pi-shield',
    teacher: 'pi pi-graduation-cap',
    student: 'pi pi-book',
    parent:  'pi pi-heart',
  pending: 'pi pi-clock',
  };

  form!: FormGroup;
  editingUserId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.loadAdminName();
    this.buildForm();
    this.loadRolesAndUsers();
  }

  private loadAdminName(): void {
    try {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        this.adminName.set(user.full_name || user.username || 'Admin');
      }
    } catch (error) {
      console.error('Hiba az admin név beolvasásakor:', error);
    }
  }

  private loadRolesAndUsers(): void {
    this.submitting.set(true);

    this.userService.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles as unknown as Role[]);
        this.loadUsers();
      },
      error: (err) => {
        this.submitting.set(false);
        this.messageService.add({ severity: 'error', summary: 'Hiba', detail: err.error?.message || 'Nem sikerült betölteni a szerepköröket.' });
      },
    });
  }

  private loadUsers(): void {
    this.userService.getUsers().pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: (users) => {
        const mapped = users.map(u => this.mapUserDtoToUser(u));
        this.users.set(mapped);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Hiba', detail: err.error?.message || 'Nem sikerült betölteni a felhasználókat.' });
      },
    });
  }

  private mapUserDtoToUser(dto: UserDto): User {
    const roleName = dto.role ?? 'pending';

    return {
      id: dto.id,
      username: dto.username,
      email: dto.email,
      full_name: dto.full_name,
      password_hash: '',
      role: roleName,
    };
  }

  private buildForm(user?: User): void {
    this.form = this.fb.group({
      username:  [user?.username  ?? '', [Validators.required, Validators.minLength(3)]],
      email:     [user?.email     ?? '', [Validators.required, Validators.email]],
      full_name: [user?.full_name ?? '', Validators.required],
      role:      [user?.role      ?? '', Validators.required],
      password:  ['', this.isEditMode() ? [] : [Validators.required, Validators.minLength(8)]],
    });

    // Aktivált felhasználónál a szerepkör ne legyen szerkeszthető
    if (this.isEditMode() && user && user.role !== 'pending') {
      this.form.get('role')?.disable();
    }
  }

  // Párbeszédablak
  openAddDialog(): void {
    this.isEditMode.set(false);
    this.editingUserId = null;
    this.buildForm();
    this.dialogVisible.set(true);
  }

  openEditDialog(user: User): void {
    this.isEditMode.set(true);
    this.editingUserId = user.id;
    this.buildForm(user);
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.form.reset();
  }

  // Mentés
  saveUser(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const val = this.form.getRawValue();

    if (this.isEditMode() && this.editingUserId) {
      const originalUser = this.users().find(u => u.id === this.editingUserId) || null;
      const originalRole = originalUser?.role ?? null;
      const targetRole = val.role as RoleName;
      const shouldActivatePending =
        originalRole === 'pending' &&
        (targetRole === 'student' || targetRole === 'teacher');

      // Aktiválás után szerepkör ne legyen módosítható
      if (originalRole && originalRole !== 'pending' && targetRole !== originalRole) {
        this.submitting.set(false);
        this.messageService.add({
          severity: 'warn',
          summary: 'Nem módosítható',
          detail: 'Aktiválás után a szerepkör már nem módosítható.',
        });
        return;
      }

      if (shouldActivatePending) {
        this.userService.activatePending(this.editingUserId, { role: targetRole })
          .pipe(finalize(() => this.submitting.set(false)))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Felhasználó aktiválva',
                detail: `${val.username} szerepköre: ${this.roleLabelMap[targetRole]}.`,
              });
              this.closeDialog();
              this.loadUsers();
            },
            error: (err) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Hiba',
                detail: err.error?.message || 'Nem sikerült aktiválni a felhasználót.',
              });
            },
          });
        return;
      }

      const payload: UpdateUserPayload = {
        username: val.username,
        email: val.email,
        full_name: val.full_name,
        ...(originalRole === 'pending' ? { role: val.role } : {}),
        ...(val.password ? { password: val.password } : {}),
      };

      this.userService.updateUser(this.editingUserId, payload)
        .pipe(finalize(() => this.submitting.set(false)))
        .subscribe({
          next: (updated) => {
            const mapped = this.mapUserDtoToUser(updated);
            this.users.update(list => list.map(u => u.id === mapped.id ? { ...u, ...mapped } : u));
            this.messageService.add({ severity: 'success', summary: 'Felhasználó frissítve', detail: `${mapped.username} adatai frissítve.` });
            this.closeDialog();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Hiba', detail: err.error?.message || 'Nem sikerült frissíteni a felhasználót.' });
          },
        });
    } else {
      const payload: CreateUserPayload = {
        username: val.username,
        email: val.email,
        full_name: val.full_name,
        password: val.password,
        role: val.role,
      };

      this.userService.createUser(payload)
        .pipe(finalize(() => this.submitting.set(false)))
        .subscribe({
          next: (created) => {
            const mapped = this.mapUserDtoToUser(created);
            this.users.update(list => [mapped, ...list]);
            this.messageService.add({ severity: 'success', summary: 'Felhasználó létrehozva', detail: `${mapped.username} hozzáadva.` });
            this.closeDialog();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Hiba', detail: err.error?.message || 'Nem sikerült létrehozni a felhasználót.' });
          },
        });
    }
  }

  canChangeRoleInDialog(): boolean {
    if (!this.isEditMode() || !this.editingUserId) {
      return true;
    }

    const editingUser = this.users().find(u => u.id === this.editingUserId);
    return editingUser?.role === 'pending';
  }

  // Gyors szerepkör váltás (aktiválás)
  changeRole(user: User, newRole: RoleName): void {
  // Backend szerződés: pending -> student/teacher aktiválás
    if (!['student', 'teacher'].includes(newRole)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Érvénytelen választás',
        detail: 'Függőben lévő felhasználót csak Tanulóvá vagy Tanárrá lehet aktiválni.',
      });
      return;
    }

    this.submitting.set(true);
    this.userService.activatePending(user.id, { role: newRole as 'student' | 'teacher' })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          // Lokális frissítés azonnali UI visszajelzéshez
          this.users.update(list => list.map(u => u.id === user.id ? { ...u, role: newRole } : u));
          this.messageService.add({
            severity: 'success',
            summary: 'Felhasználó aktiválva',
            detail: `${user.username} új szerepköre: ${this.roleLabelMap[newRole]}.`,
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Hiba',
            detail: err.error?.message || 'Nem sikerült aktiválni a felhasználót.',
          });
          // Újratöltés, hogy elkerüljük a UI/szerver eltérést
          this.loadUsers();
        },
      });
  }

  // Törlés
  confirmDelete(user: User, event: Event): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
  message: `Biztosan törölni szeretné a következő felhasználót: <strong>${user.username}</strong>? A művelet nem visszavonható.`,
  header: 'Felhasználó törlése',
      icon: 'pi pi-exclamation-triangle',
  acceptLabel: 'Törlés',
  rejectLabel: 'Mégsem',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteUser(user),
    });
  }

  private deleteUser(user: User): void {
    this.submitting.set(true);
    this.userService.deleteUser(user.id)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.users.update(list => list.filter(u => u.id !== user.id));
          this.messageService.add({ severity: 'warn', summary: 'Felhasználó törölve', detail: `${user.username} törölve lett.` });
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Hiba', detail: err.error?.message || 'Nem sikerült törölni a felhasználót.' });
        },
      });
  }

  // Segédfüggvények
  getAvatarLabel(user: User): string {
    const name = user.full_name || user.username;
    return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  getRoleName(user: User): RoleName {
    return (user.role ?? 'student') as RoleName;
  }

  countByRole(roleName: RoleName): number {
    return this.users().filter(u => u.role === roleName).length;
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  /** Ismeretlen option name biztonságos castolása */
  asRoleName(name: unknown): RoleName {
    return name as RoleName;
  }
}
