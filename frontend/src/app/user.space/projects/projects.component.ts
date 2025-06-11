import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';

import { AuthService } from '../../auth.service';

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

    constructor(private router: Router, private Auth: AuthService) {}

    ngOnInit() {
        this.load_project_structure();
    }

    load_project_structure() {
        this.project_items = [
            {
                id: 'folder_1',
                name: 'Web Projects',
                type: 'FOLDER',
                collapsed: false,
                children: [
                    {
                        id: 'group_1',
                        name: 'Active Projects',
                        type: 'GROUP',
                        projects: [
                            {
                                id: 'project_1',
                                name: 'My Website',
                                type: 'project',
                                created_at: new Date('2024-01-15'),
                                updated_at: new Date('2024-06-01'),
                                owner: 1,
                                owner_name: 'John Doe'
                            },
                            {
                                id: 'project_2',
                                name: 'E-commerce Site',
                                type: 'project',
                                created_at: new Date('2024-02-10'),
                                updated_at: new Date('2024-05-15'),
                                owner: 1,
                                owner_name: 'John Doe'
                            }, {
                                id: 'project_1',
                                name: 'My Website',
                                type: 'project',
                                created_at: new Date('2024-01-15'),
                                updated_at: new Date('2024-06-01'),
                                owner: 1,
                                owner_name: 'John Doe'
                            },
                            {
                                id: 'project_2',
                                name: 'E-commerce Site',
                                type: 'project',
                                created_at: new Date('2024-02-10'),
                                updated_at: new Date('2024-05-15'),
                                owner: 1,
                                owner_name: 'John Doe'
                            }, {
                                id: 'project_1',
                                name: 'My Website',
                                type: 'project',
                                created_at: new Date('2024-01-15'),
                                updated_at: new Date('2024-06-01'),
                                owner: 1,
                                owner_name: 'John Doe'
                            },
                            {
                                id: 'project_2',
                                name: 'E-commerce Site',
                                type: 'project',
                                created_at: new Date('2024-02-10'),
                                updated_at: new Date('2024-05-15'),
                                owner: 1,
                                owner_name: 'John Doe'
                            } ,{
                                id: 'project_1',
                                name: 'My Website',
                                type: 'project',
                                created_at: new Date('2024-01-15'),
                                updated_at: new Date('2024-06-01'),
                                owner: 1,
                                owner_name: 'John Doe'
                            },
                            {
                                id: 'project_2',
                                name: 'E-commerce Site',
                                type: 'project',
                                created_at: new Date('2024-02-10'),
                                updated_at: new Date('2024-05-15'),
                                owner: 1,
                                owner_name: 'John Doe'
                            }
                        ]
                    },
                    {
                        id: 'group_2',
                        name: 'Archived Projects',
                        type: 'GROUP',
                        projects: [
                            {
                                id: 'project_3',
                                name: 'Old Portfolio',
                                type: 'project',
                                created_at: new Date('2023-01-15'),
                                updated_at: new Date('2023-12-01'),
                                owner: 1,
                                owner_name: 'John Doe'
                            }
                        ]
                    }
                ]
            },
            {
                id: 'folder_2',
                name: 'Study Materials',
                type: 'FOLDER',
                collapsed: false,
                children: [
                    {
                        id: 'group_3',
                        name: 'Programming Notes',
                        type: 'GROUP',
                        projects: [
                            {
                                id: 'study_1',
                                name: 'Angular Notes',
                                type: 'study_material',
                                created_at: new Date('2024-03-01'),
                                updated_at: new Date('2024-06-05'),
                                owner: 1,
                                owner_name: 'John Doe'
                            }
                        ]
                    }
                ]
            }
        ];
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
        
        this.router.navigate(['workspace', this.Auth.getCurrentUserInfo()?.id ?? '#' ,project.id], {});
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
