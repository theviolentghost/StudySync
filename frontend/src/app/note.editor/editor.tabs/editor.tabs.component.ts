import { Component, Input, Output, EventEmitter  } from '@angular/core';
import { CommonModule } from '@angular/common'; 

export interface Tab {
    id: string;
    title: string;
    fileType: 'sdoc' | 'sdraw' | 'sstudy ' | 'txt' | 'md';
    data: BaseFile | null;
}
export interface BaseFile {
    name: string;
    type: string;
    lastModified: Date;
    size: number;
    content: any | null;
}
export interface SDocumentFile extends BaseFile {
    type: 'sdoc';
    content: {
        text: string // temp
    };
}

// export type FileContent = SDocumentFile | SDrawFile | SStudyFile | BaseFile;

@Component({
  selector: 'editor-tabs',
  imports: [
      CommonModule,
  ],
  templateUrl: './editor.tabs.component.html',
  styleUrl: './editor.tabs.component.css'
})
export class EditorTabsComponent {
    @Input() tabs: Tab[] = [];
    @Input() activeTabId: string | null = null;

    @Output() tabSelected = new EventEmitter<string>();
    @Output() tabClosed = new EventEmitter<string>();

    constructor() {}

    selectTab(tabId: string) {
        // this.activeTabId = tabId;
        this.tabSelected.emit(tabId);
    }

    closeTab(tabId: string) {
        this.tabClosed.emit(tabId);
    }
}
