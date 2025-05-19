import { 
    Component, 
    AfterViewInit, 
    ViewChildren, 
    ViewChild,
    QueryList, 
    OnInit, 
    ElementRef,
    OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelResizeService, PanelResizeEvent } from '../../panel.resize.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Router, ActivatedRoute, ParamMap, NavigationEnd } from '@angular/router';
import { FileManagerService } from '../../file.manager.service';


interface Tool {
    name: string;
    icon: string;
    tooltip?: string;  // Optional tooltip text
    active?: boolean; 
    color?: string; // Optional color for the tool (underlined)
    action: (element: HTMLElement) => void;
}

interface ToolGroup {
    id: string;
    collapseIcon?: string; // Optional icon for the collapsed state
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
    standalone: true,
    imports: [
        CommonModule,
    ],
    templateUrl: './document.workspace.component.html',
    styleUrl: './document.workspace.component.css',

    // encapsulation: ViewEncapsulation.None
})
export class DocumentWorkspaceComponent implements AfterViewInit, OnInit {
    @ViewChildren('toolGroup') toolGroupElements!: QueryList<ElementRef>;

    document: string = '<p>Your initial document content here...wdneifnei nfinfiwncinw icnwidniwnciwjdinwid nwicnwjdwjciwj hello heell htetx textje jsisjsj skksks</p>';
    pages: DocumentPage[] = []; 

    savedRange: Range | null = null; // To save the range before button click

    toolGroups = [
        {
          id: "TextFormatting",
          collapseIcon: "type-bold",
          collapsePriority: 1,
          active: false,
          tools: [
            { 
              name: "Bold", 
              icon: "type-bold", 
              tooltip: "Ctrl+B", 
              active: false,
              action: (element: HTMLElement) => this.boldText(element)
            },
            { 
              name: "Italic", 
              icon: "type-italic", 
              tooltip: "Ctrl+I", 
              active: false,
              action: () => console.log("Italic clicked"),
            },
            { 
              name: "Underline", 
              icon: "type-underline", 
              tooltip: "Ctrl+U", 
              active: false,
              action: () => console.log("Underline clicked"),
            },
            { 
              name: "Strike", 
              icon: "type-strikethrough", 
              tooltip: "Ctrl+Shift+X", 
              active: false,
              action: () => console.log("Strike clicked"),
            }
          ]
        },
        {
          id: "Alignments",
          collapseIcon: "align-justified",
          collapsePriority: 3,
          active: false,
          tools: [
            { 
              name: "Align Left", 
              icon: "align-left", 
              tooltip: "", 
              active: false,
              action: () => console.log("Align Left clicked"),
            },
            { 
              name: "Align Center", 
              icon: "align-center", 
              tooltip: "", 
              active: false,
              action: () => console.log("Align Center clicked"),
            },
            { 
              name: "Align Right", 
              icon: "align-right", 
              tooltip: "",
              active: false, 
              action: () => console.log("Align Right clicked"),
            },
            { 
              name: "Align Justify", 
              icon: "align-justified", 
              tooltip: "", 
              active: false,
              action: () => console.log("Align Justify clicked"),
            }
          ]
        },
        {
          id: "Lists",
          collapseIcon: "list-numbers",
          collapsePriority: 2,
          active: false,
          tools: [
            { 
              name: "Bullet List", 
              icon: "list", 
              tooltip: "", 
              active: false,
              action: () => console.log("Bullet List clicked"),
            },
            { 
              name: "Ordered List", 
              icon: "list-numbers", 
              tooltip: "", 
              active: false,
              action: () => console.log("Ordered List clicked"),
            },
            { 
              name: "Task List", 
              icon: "list-check", 
              tooltip: "", 
              active: false,
              action: () => console.log("Task List clicked"),
            }
          ]
        }
      ];

    private subscription: Subscription = new Subscription();

    constructor(
        private panelResizeService: PanelResizeService,
        private router: Router,
        private route: ActivatedRoute,
        private fileManager: FileManagerService,
    ) {}

    ngOnInit() {
        window.addEventListener('resize', this.checkAllToolGroupsCollapse.bind(this));

        this.subscription.add(
            this.panelResizeService.panelResized.subscribe((panelEvent: PanelResizeEvent) => {
                this.checkAllToolGroupsCollapse();
            })
        );

        // const currentUrl = this.router.url;
        // console.log('Current URL:', currentUrl);

        this.subscription.add(
            this.router.events.pipe(
              filter(event => event instanceof NavigationEnd)
            ).subscribe(() => {
                this.loadDocument();
            })
        );

        this.loadDocument();
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
        this.subscription.unsubscribe();
    }

    private loadDocument() {
        if (this.route.snapshot.paramMap.has('filePath')) {
            const filePath = this.route.snapshot.paramMap.get('filePath');
            const fileContent = this.fileManager.getFileContent(filePath || '');
            if (fileContent) {
                this.document = fileContent.text;
            }
        }

        this.pages = [{ content: this.document }];
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

    private boldText(element: HTMLElement) {
        // console.log(this.savedRange); //commonAncestorContainer
        // if(!this.savedRange) return;

        // const container = this.savedRange?.commonAncestorContainer;
    
        // // If the container is a text node, use its parent
        // const targetElement = (container?.nodeType === Node.TEXT_NODE 
        //     ? container.parentElement 
        //     : container as HTMLElement);
        
        // if (!targetElement) {
        //     console.log("No valid container element found");
        //     return;
        // }

        // console.log(targetElement.innerHTML);

        // let strongElements = Array.from(targetElement.querySelectorAll('strong'));
        // if(targetElement.tagName === 'STRONG') {
        //     strongElements.push(targetElement);
        // }
        // console.log(`Found ${strongElements.length} <strong> elements:`, strongElements);
        
        // Process each strong element
        // strongElements.forEach((strongEl, index) => {
        //     console.log(`Strong element ${index}:`, {
        //         content: strongEl.textContent,
        //         innerHTML: strongEl.innerHTML,
        //         outerHTML: strongEl.outerHTML
        //     });
            
        //     // Example: You could modify them here
        //     // strongEl.style.color = 'red'; // Just an example modification
        // });

    }
}
