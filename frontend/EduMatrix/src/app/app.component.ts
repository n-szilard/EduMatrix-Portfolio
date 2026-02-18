import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/system/footer/footer.component';
import { HeaderComponent } from './components/system/header/header.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, FooterComponent, HeaderComponent],
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'EduMatrix';
}
