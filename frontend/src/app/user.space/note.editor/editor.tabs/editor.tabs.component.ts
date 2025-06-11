import { Component, Input, Output, EventEmitter, OnInit  } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { Router, ActivatedRoute } from '@angular/router';
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
    userId: string | null = null; 
    projectId: string | null = null;

    @Output() tabSelected = new EventEmitter<string>();
    @Output() tabClosed = new EventEmitter<string>();

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private fileManager: FileManagerService
    ) {}

    ngOnInit(): void {
        this.fileManager.openNewTabInWorkspace.subscribe((file: File) => {
            if(this.selectTab(file.name)) return;
            this.openNewTabFromFile(file);
        });
        this.route.params.subscribe(params => {
            this.projectId = params['projectId'];
            this.userId = params['userId'];
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

    selectTab(tabId: string): boolean {
        this.activeTabId = tabId;

        const tabSelected = this.tabs.find(tab => tab.id === tabId);
        if (!tabSelected) return false;

        // Handle special case for welcome tab
        if (tabSelected.fileType === 'WELCOME') {
            this.router.navigate(['/workspace', this.userId, this.projectId, { 
                outlets: { 
                    workspace: ['WELCOME'] 
                } 
            }], { skipLocationChange: true });
            return true;
        }

        // For file tabs, construct the proper route
        const filePath = `${tabSelected.directory}${tabId}.${tabSelected.fileType}`.replace(/^\//, ''); // Remove leading slash
        
        // Map file types to route prefixes
        let routePrefix = '';
        switch (tabSelected.fileType) {
            case 'sdoc':
            case 'doc':
            case 'pdf':
                routePrefix = 'sdoc';
                break;
            case 'sdraw':
            case 'draw':
            case 'png':
            case 'jpg':
                routePrefix = 'sdraw';
                break;
            case 'sstudy':
            case 'study':
            case 'md':
                routePrefix = 'sstudy';
                break;
            default:
                routePrefix = 'sdoc'; // Default fallback
        }

        this.router.navigate(['/workspace', this.userId, this.projectId, { 
            outlets: { 
                workspace: [routePrefix, filePath] 
            } 
        }], { skipLocationChange: true });

        return true;
    }

    setNoTabSelectedState(): void {
        this.activeTabId = null;
        
        this.router.navigate(['/workspace', this.userId, this.projectId, {
            outlets: {
                workspace: ['SELECTFILE']
            }
        }], { skipLocationChange: true });
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
