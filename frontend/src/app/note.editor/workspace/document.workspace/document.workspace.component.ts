import { 
    Component, 
    AfterViewInit, 
    ViewChildren, 
    QueryList, 
    ElementRef, 
    OnInit, 
    OnDestroy,
    ViewEncapsulation
} from '@angular/core';
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

interface DocumentPage {
    content: string;
    element?: HTMLElement; 
}

@Component({
    selector: 'document-workspace',
    imports: [
        CommonModule,
    ],
    templateUrl: './document.workspace.component.html',
    styleUrl: './document.workspace.component.css',

    // encapsulation: ViewEncapsulation.None
})
export class DocumentWorkspaceComponent implements AfterViewInit, OnInit {
    toolGroups: ToolGroup[] = [
        {
            title: "Text Formatting",
            tools: [
                { name: "Bold", icon: "type-bold", tooltip: "Ctrl+B", action: this._ToolOnClick_bold.bind(this), active: true },
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

    document: string = '<p>Your initial document content here...wdneifnei nfinfiwncinw icnwidniwnciwjdinwid nwicnwjdwjciwj hello heell htetx textje jsisjsj skksks</p>';
    pages: DocumentPage[] = []; 

    savedRange: Range | null = null; // To save the range before button click

    ngOnInit() {
        this.pages = [{ content: this.document }];
    }

    ngAfterViewInit() {
        const toolbar = document.querySelector('.tools-container');
        if (toolbar) {
            toolbar.addEventListener('mousedown', this.saveSelectionBeforeButtonClick);
        }
    }
    
    ngOnDestroy() {
        const toolbar = document.querySelector('.tools-container');
        if (toolbar) {
            toolbar.removeEventListener('mousedown', this.saveSelectionBeforeButtonClick);
        }
    }

    saveSelectionBeforeButtonClick = (event: Event) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        // Save the range object which is more reliable
        this.savedRange = selection.getRangeAt(0).cloneRange();
    }

    _ToolOnClick_bold() {
        console.log(this.savedRange)
        const pageElement = this.savedRange?.startContainer.parentElement;
        if (pageElement) {
            const selectedText = this.savedRange?.toString();
            if (!selectedText) return;

            const boldElement = document.createElement('span');
            boldElement.className = 'text-bold';
            boldElement.textContent = selectedText;

            this.savedRange?.deleteContents();
            this.savedRange?.insertNode(boldElement);
        }
    }

    
}
