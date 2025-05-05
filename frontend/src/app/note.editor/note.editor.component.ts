import { Component } from '@angular/core';
import { EditorHeaderComponent} from './editor.header/editor.header.component';
import { EditorToolsComponent } from './editor.tools/editor.tools.component';
import { EditorTabsComponent, Tab } from './editor.tabs/editor.tabs.component';
import { WorkspaceComponent } from './workspace/workspace.component';
import { EditorConsoleComponent } from './editor.console/editor.console.component';
import { PanelResizeService } from './panel.resize.service';

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

    tabs: Tab[] = [
        {
            id: 'tab1',
            title: 'Tab 1',
            fileType: 'sdoc',
            data: null
        },
        {
            id: 'tab2',
            title: 'Tab 2',
            fileType: 'txt',
            data: null
        }
    ];
    activeTabId: string | null = "tab1"; //temp

    constructor (
        private panelResizeService: PanelResizeService
    ) {
        this.minimumWorspaceWidth = this.panelResizeService.minimumWorkspaceWidth;

    }

    selectTab(tabId: string) {
        this.activeTabId = tabId;
    }

    closeTab(tabId: string) {
        this.tabs = this.tabs.filter(tab => tab.id !== tabId);
        if (this.activeTabId === tabId) {
            this.activeTabId = this.tabs.length > 0 ? this.tabs[0].id : null;
        }
        console.log("new tab:", this.activeTabId);
        console.log("tabs:", this.tabs);
    }
}
