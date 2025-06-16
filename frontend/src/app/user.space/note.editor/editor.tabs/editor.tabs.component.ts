import { Component, Input, Output, EventEmitter, OnInit  } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { Router, ActivatedRoute } from '@angular/router';
import { File, FileManagerService } from '../file.manager.service';

export interface Tab {
    id: string; // file name
    path: string; // directory name
    display: string;
    title: string; 
    file_type: string;
}

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
            id: 'WELCOME',
            title: 'Get Started',
            display: 'Get Started',
            file_type: 'WELCOME',
            path: '/',
        }
    ];
    active_tab_id: string | null = "WELCOME";
    user_id: string | null = null; 
    project_id: string | null = null;

    @Output() tab_selected = new EventEmitter<string>();
    @Output() tab_closed = new EventEmitter<string>();

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private file_manager: FileManagerService
    ) {}

    ngOnInit(): void {
        this.file_manager.open_new_tab_in_workspace.subscribe((file: File) => {
            if(this.select_tab(file.id)) return;
            this.open_new_tab_from_file(file);
        });

        this.route.params.subscribe(params => {
            this.project_id = params['projectId'];
            this.user_id = params['userId'];
        });
    }

    open_new_tab_from_file(file: File): void {
        const new_tab: Tab = {
            id: file.id,
            title: file.name,
            display: file.name,
            file_type: file.type,
            path: file.path,
        };

        // check to make sure no other tabs with same title exist
        // if so include part of the path in the title
        const copy_cat_tab  = this.tabs.find(tab => tab.display === new_tab.display && tab.file_type === new_tab.file_type);
        if (copy_cat_tab) {
            // both tabs shouldnt have same path, // so we can safely use the path to differentiate them
            const copy_cat_tab_prefix = copy_cat_tab.path.split('/').filter(part => part !== '').pop() || '';
            copy_cat_tab.display = copy_cat_tab_prefix ? `${copy_cat_tab_prefix}/${copy_cat_tab.display}` : copy_cat_tab.display; // no prefix if empty

            // also change current tab as if it was the copy cat tab
            const new_tab_prefix = new_tab.path.split('/').filter(part => part !== '').pop() || '';
            new_tab.display = new_tab_prefix ? `${new_tab_prefix}/${new_tab.display}` : new_tab.display; // no prefix if empty
        }

        this.tabs.push(new_tab);
        this.select_tab(file.id);
    }

    select_tab(tab_id: string): boolean {
        this.active_tab_id = tab_id;

        const tab_selected = this.tabs.find(tab => tab.id === tab_id);
        if (!tab_selected) return false;

        // Handle special case for welcome tab
        if (tab_selected.file_type === 'WELCOME') {
            this.router.navigate(['/workspace', this.user_id, this.project_id, { 
                outlets: { 
                    workspace: ['WELCOME'] 
                } 
            }], { skipLocationChange: true });
            return true;
        }

        // For file tabs, construct the proper route
        const file_path = `${tab_selected.path}${tab_selected.title}.${tab_selected.file_type}`.replace(/^\//, ''); // Remove leading slash
        
        // Map file types to route prefixes
        let route_prefix = '';
        switch (tab_selected.file_type) {
            case 'sdoc':
            case 'doc':
            case 'pdf':
                route_prefix = 'sdoc';
                break;
            case 'sdraw':
            case 'draw':
            case 'png':
            case 'jpg':
                route_prefix = 'sdraw';
                break;
            case 'sstudy':
            case 'study':
            case 'md':
                route_prefix = 'sstudy';
                break;
            default:
                route_prefix = 'sdoc'; // Default fallback
        }

        this.router.navigate(['/workspace', this.user_id, this.project_id, { 
            outlets: { 
                workspace: [route_prefix, file_path] 
            } 
        }], { skipLocationChange: true });

        return true;
    }

    set_no_tab_selected_state(): void {
        this.active_tab_id = null;
        
        this.router.navigate(['/workspace', this.user_id, this.project_id, {
            outlets: {
                workspace: ['SELECTFILE']
            }
        }], { skipLocationChange: true });
    }

    close_tab(tab_id: string) {
        const tab_index = this.tabs.findIndex(tab => tab.id === tab_id);
        if (tab_index !== -1) {
            this.tabs.splice(tab_index, 1);
            this.tab_closed.emit(tab_id);

            // If the closed tab was active, select the previous tab or set no tab selected
            if (this.active_tab_id === tab_id && this.tabs.length > 0) {
                this.select_tab(this.tabs[tab_index - 1]?.id ?? this.tabs[0].id);
            }
            else {
                this.set_no_tab_selected_state();
            }
        }
    }
}
