import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NoteEditorComponent } from './note.editor/note.editor.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    NoteEditorComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'my-angular-app';
}
