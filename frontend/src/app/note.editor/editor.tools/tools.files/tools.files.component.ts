import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { File, Folder, FileManagerService  } from '../../file.manager.service';

@Component({
  selector: 'tools-files',
  imports: [
    CommonModule,
  ],
  templateUrl: './tools.files.component.html',
  styleUrl: './tools.files.component.css'
})
export class ToolsFilesComponent {
    @Input() name: string = "Files";

    constructor(
        private fileManager: FileManagerService
    ) {}
    
    get files(): File[] {
        return this.fileManager.getRootChildren();
    }

    getFilesFromFolder(folder: Folder): File[] {
        return this.fileManager.getChildrenOfFolder(folder);
    }

    getFolderColor(depth: number): string {
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

    openFile(file: File) {
        this.fileManager.openFileInWorkspace(file);
    }
}
