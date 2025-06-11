import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { NoteEditorComponent } from './user.space/note.editor/note.editor.component';
import { CursorComponent } from './cursor/cursor.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterModule,
    NoteEditorComponent,
    CursorComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

}
