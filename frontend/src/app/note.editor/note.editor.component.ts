import { Component } from '@angular/core';
import { EditorHeaderComponent} from './editor.header/editor.header.component';
import { EditorToolsComponent } from './editor.tools/editor.tools.component';
import { EditorTabsComponent } from './editor.tabs/editor.tabs.component';
import { WorkspaceComponent } from './workspace/workspace.component';

@Component({
  selector: 'note-editor',
  imports: [
    EditorHeaderComponent,
    EditorToolsComponent,
    EditorTabsComponent,
    WorkspaceComponent,
  ],
  templateUrl: './note.editor.component.html',
  styleUrl: './note.editor.component.css'
})
export class NoteEditorComponent {

}
