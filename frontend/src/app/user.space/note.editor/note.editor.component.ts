import { Component } from '@angular/core';
import { EditorHeaderComponent} from './editor.header/editor.header.component';
import { EditorToolsComponent } from './editor.tools/editor.tools.component';
import { EditorTabsComponent, Tab } from './editor.tabs/editor.tabs.component';
import { WorkspaceComponent } from './workspace/workspace.component';
import { EditorConsoleComponent } from './editor.console/editor.console.component';
import { PanelResizeService } from './panel.resize.service';
import { File } from './file.manager.service';

@Component({
  selector: 'note-editor',
  host: {
      '[style.--minimum-workspace-width]': 'minimumWorspaceWidth + "px"',
  },
  imports: [
      EditorHeaderComponent,
      EditorToolsComponent,
      EditorTabsComponent,
      WorkspaceComponent,
      EditorConsoleComponent
  ],
  templateUrl: './note.editor.component.html',
  styleUrl: './note.editor.component.css'
})
export class NoteEditorComponent {
    minimumWorspaceWidth: number = 0; // px

    files: File[] = [];

    // tabs: Tab[] = [
    //     {
    //         id: 'document 1',
    //         title: 'Tab 1',
    //         fileType: 'sdoc',
    //         directory: '/',
    //         data: null
    //     },
    //     {
    //         id: 'draw',
    //         title: 'drawing',
    //         fileType: 'sdraw',
    //         directory: '/',
    //         data: null
    //     },
    //     {
    //         id: 'tab2',
    //         title: 'Tab 2',
    //         fileType: 'txt',
    //         directory: '/',
    //         data: null
    //     }
    // ];

    constructor (
        private panelResizeService: PanelResizeService
    ) {
        this.minimumWorspaceWidth = this.panelResizeService.minimumWorkspaceWidth;

    }

    selectTab(tabId: string) {
        
    }

    closeTab(tabId: string) {
        
    }
}
