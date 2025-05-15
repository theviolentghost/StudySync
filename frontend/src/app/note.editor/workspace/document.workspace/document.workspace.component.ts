import { 
    Component, 
    AfterViewInit, 
    ViewChildren, 
    QueryList, 
    OnInit, 
    ElementRef,
    OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelResizeService, PanelResizeEvent } from '../../panel.resize.service';

interface Tool {
    name: string;
    icon: string;
    tooltip?: string;  // Optional tooltip text
    active?: boolean; 
    color?: string; // Optional color for the tool (underlined)
    action: () => void;
}

interface ToolGroup {
    id: string;
    collapsePriority?: number; // Optional priority for collapsing high = less likely to collapse
    tools: Tool[];
    active?: boolean; // when collapsed: is open
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
            id: "Text Formatting",
            collapsePriority: 1,
            tools: [
                { name: "Bold", icon: "type-bold", tooltip: "Ctrl+B", action: this._ToolOnClick_bold.bind(this), active: true },
                { name: "Italic", icon: "type-italic", action: () => console.log("Italic clicked") },
                { name: "Underline", icon: "type-underline", action: () => console.log("Underline clicked") }
            ]
        },
        {
            id: "Colors",
            collapsePriority: 10,
            tools: [
                { name: "Text Color", icon: "null", tooltip: "", action: () => console.log("Color clicked") },
                { name: "Text Color", icon: "null", tooltip: "", action: () => console.log("Color clicked") },
                { name: "Text Color", icon: "null", tooltip: "", action: () => console.log("Color clicked") },
                { name: "Text Color", icon: "null", tooltip: "", action: () => console.log("Color clicked") },
                { name: "Text Color", icon: "type-bold", tooltip: "", action: () => console.log("Color clicked") },
            ]
        },
        {
            id: "Lists",
            collapsePriority: 2,
            tools: [
                { name: "Text Color", icon: "null", tooltip: "", action: () => console.log("Color clicked") },
                { name: "Text Color", icon: "null", tooltip: "", action: () => console.log("Color clicked") },
                { name: "Text Color", icon: "null", tooltip: "", action: () => console.log("Color clicked") },
                { name: "Text Color", icon: "null", tooltip: "", action: () => console.log("Color clicked") },
                { name: "Text Color", icon: "type-bold", tooltip: "", action: () => console.log("Color clicked") },
            ]
        },
    ];

    @ViewChildren('toolGroup') toolGroupElements!: QueryList<ElementRef>;

    private resizeObserver!: ResizeObserver;

    document: string = '<p>Your initial document content here...wdneifnei nfinfiwncinw icnwidniwnciwjdinwid nwicnwjdwjciwj hello heell htetx textje jsisjsj skksks</p>';
    pages: DocumentPage[] = []; 

    savedRange: Range | null = null; // To save the range before button click

    constructor(
        private panelResizeService: PanelResizeService
    ) {}

    ngOnInit() {
        this.pages = [{ content: this.document }];

        window.addEventListener('resize', this.checkAllToolGroupsCollapse.bind(this));

        this.panelResizeService.panelResized.subscribe((panelEvent: PanelResizeEvent) => {
            this.checkAllToolGroupsCollapse();
        });
    }

    ngAfterViewInit() {
        const toolbar = document.querySelector('.tools-container');
        if (toolbar) {
            toolbar.addEventListener('mousedown', this.saveSelectionBeforeButtonClick);
        }

        this.checkAllToolGroupsCollapse();
    }
    
    ngOnDestroy() {
        const toolbar = document.querySelector('.tools-container');
        if (toolbar) {
            toolbar.removeEventListener('mousedown', this.saveSelectionBeforeButtonClick);
        }
        this.panelResizeService.panelResized.unsubscribe();
    }

    getToolBarSpace(element: HTMLElement, groupsLength: number): number {
        const style = window.getComputedStyle(element);
        const paddingLeft = parseFloat(style.paddingLeft);
        const paddingRight = parseFloat(style.paddingRight);
        const gap = parseFloat(style.gap) || 0;
        return element.clientWidth - paddingLeft - paddingRight - (gap * (groupsLength - 1)) - 20; // -20 just for prettiness
    }

    checkAllToolGroupsCollapse() {
        const toolGroups = this.toolGroupElements.toArray().sort((a, b) => {
            let priorityA = parseInt(a.nativeElement.getAttribute('data-group-collapse-priority') || '0');
            let priorityB = parseInt(b.nativeElement.getAttribute('data-group-collapse-priority') || '0');
            return priorityA - priorityB;
        });


        let toolGroupsWidth = this.toolGroupElements.reduce((total, group) => {
            const element = group.nativeElement;
            element.classList.remove('collapsed'); // Remove the collapsed class
            return total + element.clientWidth;
        }, 0);

        let toolBarSpace = this.getToolBarSpace(document.querySelector('.tools-container') as HTMLElement, toolGroups.length);

        let index = 0;
        while(toolGroupsWidth > toolBarSpace && index < toolGroups.length) {
            const element = toolGroups[index++].nativeElement;
            toolGroupsWidth -= element.clientWidth;
            element.classList.add('collapsed');
            toolGroupsWidth += element.clientWidth;
        }
    }

    toggleToolGroupCollapse(element: HTMLElement) {
        const groupId = element.getAttribute('data-group-name');
        if (!groupId) return;
        const group = this.toolGroups.find(group => group.id === groupId);
        if (!group) return;

        group.active = !group.active;
    }

    saveSelectionBeforeButtonClick = (event: Event) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        // Save the range object which is more reliable
        this.savedRange = selection.getRangeAt(0).cloneRange();
    }

    _ToolOnClick_bold() {
        // use prosemirror
        // if (!this.savedRange) return;
        // if (this.savedRange.collapsed) return;

        // console.log(this.savedRange)

        // const isInsideBold = (node: Node): boolean => {
        //     let parent = node.parentElement;
        //     while (parent) {
        //         if (parent.tagName === 'STRONG') return true;
        //         parent = parent.parentElement;
        //     }
        //     return false;
        // };

        // const startInsideBold = isInsideBold(this.savedRange.startContainer);
        // const endInsideBold = isInsideBold(this.savedRange.endContainer);
        
        // // Extract the selection content
        // const fragment = this.savedRange.cloneContents();
        // const selectedText = fragment.textContent;
        
        // if (!selectedText) return;
        
        // // If selection is fully inside a bold element, remove bold formatting
        // if (startInsideBold && endInsideBold) {
        //     // Create document fragment with plain text
        //     const newFragment = document.createDocumentFragment();
        //     newFragment.textContent = selectedText;
            
        //     this.savedRange.deleteContents();
        //     this.savedRange.insertNode(newFragment);
        // } else {
        //     // Apply bold formatting
        //     const boldElement = document.createElement('strong');
        //     boldElement.textContent = selectedText;
            
        //     this.savedRange.deleteContents();
        //     this.savedRange.insertNode(boldElement);
        // }
        
        // // Restore selection
        // document.getSelection()?.removeAllRanges();
        // const newRange = document.createRange();
        // newRange.setStartAfter(this.savedRange.endContainer);
        // document.getSelection()?.addRange(newRange);
    }

    
}
