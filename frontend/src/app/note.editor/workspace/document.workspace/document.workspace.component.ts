import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Tool {
    name: string;
    icon: string;
    tooltip?: string;  // Optional tooltip text
    active?: boolean; 
    color?: string; // Optional color for the tool (underlined)
    action: () => void;
}

interface ToolGroup {
    title: string;
    tools: Tool[];
}

@Component({
    selector: 'document-workspace',
    imports: [
        CommonModule,
    ],
    templateUrl: './document.workspace.component.html',
    styleUrl: './document.workspace.component.css'
})
export class DocumentWorkspaceComponent {
    toolGroups: ToolGroup[] = [
        {
            title: "Text Formatting",
            tools: [
                { name: "Bold", icon: "type-bold", tooltip: "Ctrl+B", action: () => console.log("Bold clicked") },
                { name: "Italic", icon: "type-italic", action: () => console.log("Italic clicked") },
                { name: "Underline", icon: "type-underline", action: () => console.log("Underline clicked") }
            ]
        },
        {
            title: "Colors",
            tools: [
                { name: "Text Color", icon: "", tooltip: "", action: () => console.log("Color clicked") },
            ]
        }
    ];

    constructor() {}
}
