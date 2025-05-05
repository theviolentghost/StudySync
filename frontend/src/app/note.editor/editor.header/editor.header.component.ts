import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { HeaderButtonComponent } from './header.button/header.button.component';

interface ProjectTool {
  name: string;
  icon: string;
  action?: () => void;
}

@Component({
  selector: 'editor-header',
  imports: [
      CommonModule,
      HeaderButtonComponent,
  ],
  templateUrl: './editor.header.component.html',
  styleUrl: './editor.header.component.css'
})

export class EditorHeaderComponent {
    projectName: string = "Project Name"; // Placeholder for project name
    projectTools: ProjectTool[] = [
        {
          name: 'Project', icon: 'null', 
        },
        {
          name: 'View', icon: 'null', 
        },
    ]; 
    fileTools: ProjectTool[] = [
        {
          name: 'File', icon: 'null', 
        },
        {
          name: 'Insert', icon: 'null', 
        },
    ];
}
