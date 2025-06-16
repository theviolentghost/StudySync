import { Component, Input, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ProjectService } from '../../../../project.service';
import { File, Folder, FileSystemEntry, FileManagerService  } from '../../file.manager.service';

@Component({
  selector: 'tools-files',
  imports: [
    CommonModule,
  ],
  templateUrl: './tools.files.component.html',
  styleUrl: './tools.files.component.css'
})
export class ToolsFilesComponent implements AfterViewInit {
    @Input() name: string = "Files";

    file_entries: FileSystemEntry[] = [];

    constructor(private file_manager: FileManagerService, private route: ActivatedRoute, private project_service: ProjectService) {}

    ngAfterViewInit(): void {
        this.route.params.subscribe(params => {


            const projectId = params['projectId'];
            const userId = params['userId'];

            if (projectId && projectId.startsWith('project_')) {
                this.project_service.project_id = parseInt(projectId.substring('project_'.length), 10);
            } else if (!isNaN(Number(projectId))) {
                this.project_service.project_id = Number(projectId);
            } else {
                this.project_service.project_id = null;
            }

            this.project_service.user_id = userId ? parseInt(userId, 10) : null;

            this.file_manager.init_all_file_metadata();
            this.file_manager.file_system_updated.subscribe((file_entries: FileSystemEntry[]) => {
                this.file_entries = file_entries;
                console.log('File entries updated:', this.file_entries);
            });
        });
    }



    get_children_from_directory(folder: FileSystemEntry): FileSystemEntry[] {
        return this.file_manager.get_children_from_directory(folder as Folder);
    }

    get_folder_color(depth: number): string {
        // Define an array of colors for different depths
        const colors = [
            'var(--workspace-workcolor-1)',
            'var(--workspace-workcolor-2)',
            'var(--workspace-workcolor-3)',
            'var(--workspace-workcolor-4)',
            'var(--workspace-workcolor-5)',
            'var(--workspace-workcolor-6)',
        ];
        
        return colors[depth % colors.length];
    }

    open_file(file: File) {
        this.file_manager.open_file_in_workspace(file);
    }
}
