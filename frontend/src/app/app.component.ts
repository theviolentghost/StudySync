import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { NoteEditorComponent } from './note.editor/note.editor.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterModule,
    NoteEditorComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

}
