import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CursorComponent } from './cursor/cursor.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterModule,
    CursorComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

}
