import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';

import { AuthService } from '../../auth.service';
import { ProjectService } from '../../project.service';

export interface Project {
    id?: string;
    type: 'FOLDER' | 'GROUP' | 'project' | 'study_material' | 'assignment' | 'notes';
    collapsed?: boolean; // for folders
    children?: Project[]; // for folders
    name: string;
    description?: string;
    created_at?: Date;
    updated_at?: Date;
    owner?: number;
    owner_name?: string; // fetch from user service
    members?: number[];
}

export interface Project_Item {
    id: string;
    name: string;
    type: 'FOLDER' | 'GROUP' | 'project' | 'study_material' | 'assignment' | 'notes';
    collapsed?: boolean; // for folders and groups
    children?: Project_Item[]; // for folders
    projects?: Project[]; // for groups
}

@Component({
    selector: 'app-projects',
    standalone: true,
    imports: [
        CommonModule
    ],
    templateUrl: './projects.component.html',
    styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit {
    project_items: Project_Item[] = [];
    current_path: string[] = ['Projects'];
    current_folder_projects: Project[] = [];
    selected_group_id: string = '';

    constructor(private router: Router, private Auth: AuthService, private ProjectService: ProjectService) {}

    ngOnInit() {
        this.load_project_structure();
    }

    load_project_structure() {
        this.project_items = [];
        this.ProjectService.get_hierarchy().subscribe(
            (data: Project_Item[]) => {
                console.log('Project hierarchy loaded:', data);
                this.project_items = data;
            }
        );
    }

    toggle_folder(folder: Project_Item) {
        folder.collapsed = !folder.collapsed;
    }

    select_group(group: Project_Item) {
        this.selected_group_id = group.id;
        this.current_folder_projects = group.projects || [];
        
        // Update breadcrumb
        this.update_path_for_group(group.id);
    }

    update_path_for_group(group_id: string) {
        const build_group_path = (items: Project_Item[], target_id: string, current_path: string[] = []): string[] | null => {
            for (const item of items) {
                const new_path = [...current_path, item.name];
                
                if (item.id === target_id && item.type === 'GROUP') {
                    return new_path;
                }
                
                if (item.children) {
                    const found_path = build_group_path(item.children, target_id, new_path);
                    if (found_path) {
                        return found_path;
                    }
                }
            }
            return null;
        };

        const path = build_group_path(this.project_items, group_id);
        if (path) {
            this.current_path = ['Projects', ...path];
        }
        this.trigger_fake_navigation();
    }

    navigate_to_path(path: string) {
        console.log('Navigating to path:', path);
    }

    open_project(project: Project) {
        console.log('Opening project:', project.name);
        console.log(this.Auth.getCurrentUserInfo())

        this.router.navigate(['workspace', this.Auth.getCurrentUserInfo()?.id || '#' ,project.id], {});
    }

    show_project_options(project: Project) {
        console.log('Showing options for project:', project.name);
    }

    private trigger_fake_navigation() {
        // Create a fake NavigationEnd event
        const fakeNavigationEnd = new NavigationEnd(
            1, // id
            this.router.url, // current URL
            this.router.url  // urlAfterRedirects
        );

        // Emit the event manually
        (this.router.events as any).next(fakeNavigationEnd);
    }
    get_group_width(depth: number): string {
        const indentPx = ((depth || 0) + 1) * 16;
        return `calc(100% - ${indentPx}px)`;
    }
}
