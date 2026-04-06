import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/system/footer/footer.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, FooterComponent],
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'EduMatrix';
}
