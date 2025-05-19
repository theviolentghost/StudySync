import { Component, Input, Output, EventEmitter, OnInit  } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router';
import { File, FileManagerService } from '../file.manager.service';

export interface Tab {
    id: string; // file name
    directory: string; // directory name
    title: string; 
    fileType: string;
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
export class EditorTabsComponent implements OnInit{
    @Input() files: File[] = []; 
    tabs: Tab[] = [
        {
            id: 'welcome',
            title: 'Get Started',
            fileType: 'WELCOME',
            directory: '/',
        }
    ];
    activeTabId: string | null = "welcome";

    @Output() tabSelected = new EventEmitter<string>();
    @Output() tabClosed = new EventEmitter<string>();

    constructor(
        private router: Router,
        private fileManager: FileManagerService
    ) {}

    ngOnInit(): void {
        this.fileManager.openNewTabInWorkspace.subscribe((file: File) => {
            if(this.selectTab(file.name)) return;
            this.openNewTabFromFile(file);
        });
    }

    openNewTabFromFile(file: File): void {
        const tab: Tab = {
            id: file.name,
            title: file.name,
            fileType: file.type,
            directory: file.directory,
        };

        this.tabs.push(tab);
        this.selectTab(file.name);
    }

    setNoTabSelectedState(): void {
        this.activeTabId = null;
        
        this.router.navigate([{
            outlets: {
                workspace: ['SELECTFILE']
            }
        }], {skipLocationChange: true});
    }

    selectTab(tabId: string): boolean {
        this.activeTabId = tabId;

        const tabSelected = this.tabs.find(tab => tab.id === tabId);
        if (!tabSelected) return false;

        // this.tabSelected.emit(tabId);

        this.router.navigate([{ 
            outlets: { 
              workspace: [tabSelected.fileType, `${tabSelected.directory}${tabId}.${tabSelected.fileType}`] 
            } 
          }], { skipLocationChange: true });
        return true; // in future you could check if the tab was actually reached
    }

    closeTab(tabId: string) {
        const tabIndex = this.tabs.findIndex(tab => tab.id === tabId);
        if (tabIndex !== -1) {
            this.tabs.splice(tabIndex, 1);
            this.tabClosed.emit(tabId);

            // If the closed tab was active, select the first tab
            if (this.activeTabId === tabId && this.tabs.length > 0) {
                this.selectTab(this.tabs[tabIndex - 1].id);
            }
            else {
                this.setNoTabSelectedState();
            }
        }
    }
}
