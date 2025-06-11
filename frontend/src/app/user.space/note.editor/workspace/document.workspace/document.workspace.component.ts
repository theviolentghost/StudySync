import { 
    Component, 
    AfterViewInit, 
    ViewChildren, 
    ViewChild,
    QueryList, 
    OnInit, 
    ElementRef,
    OnDestroy,
    ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelResizeService, PanelResizeEvent } from '../../panel.resize.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { Router, ActivatedRoute, ParamMap, NavigationEnd, NavigationStart } from '@angular/router';
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

    encapsulation: ViewEncapsulation.None,
})
export class DocumentWorkspaceComponent implements AfterViewInit, OnInit {
    @ViewChildren('toolGroup') toolGroupElements!: QueryList<ElementRef>;
    @ViewChild('pageContent') pageContent!: ElementRef;
    @ViewChild('scrollContent') scrollContent!: ElementRef;
    private mutationObserver: MutationObserver | null = null;

    private inactivityTimeTillSave: number = 2000; //ms

    document: string = '<p>Your initial document content here...wdneifnei nfinfiwncinw icnwidniwnciwjdinwid nwicnwjdwjciwj hello heell htetx textje jsisjsj skksks</p>';

    private currentFilePath: string | null = null;
    private documentChanges = new Subject<string>();
    private autoSaveSubscription: Subscription = new Subscription();
    private panelResizeSubscription: Subscription = new Subscription();
    private routerSubscription: Subscription = new Subscription();

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

    constructor(
        private panelResizeService: PanelResizeService,
        private router: Router,
        private route: ActivatedRoute,
        private fileManager: FileManagerService,
    ) {}

    ngOnInit() {
        this.currentFilePath = this.route.snapshot.paramMap.get('filePath');
        //this.loadDocument();
        window.addEventListener('resize', this.checkAllToolGroupsCollapse.bind(this));

        this.panelResizeSubscription.add(
            this.panelResizeService.panelResized.subscribe((panelEvent: PanelResizeEvent) => {
                this.checkAllToolGroupsCollapse();
            })
        );
        
        this.routerSubscription.add(
            this.router.events.pipe(
                filter(event => event instanceof NavigationStart)  // <-- Changed to NavigationStart
            ).subscribe((event: NavigationStart) => {
                // When navigation starts, save the CURRENT document
                if (this.currentFilePath) {
                    this.saveDocument(this.getTextContent(), this.currentFilePath);
                }
            })
        );
    
        // Handle successful navigation to update the current path
        this.routerSubscription.add(
            this.router.events.pipe(
                filter(event => event instanceof NavigationEnd)
            ).subscribe(() => {
                // After navigation completes, update current path and load new document
                this.currentFilePath = this.route.snapshot.paramMap.get('filePath');
                this.loadDocument();
            })
        ); 

        this.autoSaveSubscription.add(
            this.documentChanges.pipe(
                debounceTime(this.inactivityTimeTillSave),  
                distinctUntilChanged() 
            ).subscribe(content => {
                this.saveDocument(content);
            })
        );
    }

    ngAfterViewInit() {
        const toolbar = document.querySelector('.tools-container');
        if (toolbar) {
            toolbar.addEventListener('mousedown', this.saveSelectionBeforeButtonClick);
        }


        this.pageContent.nativeElement.addEventListener('input', () => {
            const content = this.getTextContent();
            this.documentChanges.next(content)
            const scrollContent = this.wrapWordsWithSpansWithComputedStyle(this.pageContent.nativeElement);
            this.updateDynamicScrollViewContent(scrollContent);
        });

        this.checkAllToolGroupsCollapse();
        this.loadDocument();
    }
    
    ngOnDestroy() {
        const toolbar = document.querySelector('.tools-container');
        if (toolbar) {
            toolbar.removeEventListener('mousedown', this.saveSelectionBeforeButtonClick);
        }
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
        this.panelResizeSubscription.unsubscribe();
        this.routerSubscription.unsubscribe();
        this.autoSaveSubscription.unsubscribe();

        window.removeEventListener('resize', this.checkAllToolGroupsCollapse.bind(this));
    }

    private loadDocument() {
        if (this.route.snapshot.paramMap.has('filePath')) {
            const filePath = this.route.snapshot.paramMap.get('filePath');
            const fileContent = this.fileManager.getFileContent(filePath || '');
            if (fileContent) {
                this.document = fileContent.text;
                this.pageContent.nativeElement.innerHTML = this.document;
                setTimeout(() => {
                    const scrollContent = this.wrapWordsWithSpansWithComputedStyle(this.pageContent.nativeElement);
                    this.updateDynamicScrollViewContent(scrollContent);
                },0);
            }
        }
    }
    private saveDocument(content: string, path: string | null = null) {
        if (!content || content.trim() === '') return;
        this.document = content;
        // alert(this.document)

        const filePath = path || this.currentFilePath || '';
        console.log('Saving document... ', filePath);
        this.fileManager.saveFileContent(filePath,  {text: this.document});
    }
    private getTextContent() {
        return this.pageContent.nativeElement.innerHTML;
    }
    private updateDynamicScrollViewContent(content: string) {
        this.scrollContent.nativeElement.innerHTML = content;
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

    private findAncestor(node: Node, tagName: string): HTMLElement | null {
        tagName = tagName;
        while (node && node !== document) {
            if ((node as HTMLElement).tagName === tagName) {
                return node as HTMLElement;
            }
            node = node.parentNode!;
        }
        return null;
    }

    private boldText(element: HTMLElement) {
        const range = this.savedRange;
        console.log(range);
        if (!range || range.collapsed) return;

        const nearestParent = this.savedRange?.commonAncestorContainer.parentElement;
        const nearestStartContainerStrong = this.findAncestor(range.startContainer, "strong");
        const nearestEndContainerStrong = this.findAncestor(range.endContainer, "strong");

        console.log(nearestStartContainerStrong, nearestEndContainerStrong);

        const strongNodes = nearestParent?.getElementsByTagName("strong");

        // Convert HTMLCollection to array if you want to manipulate it
        let strongArray: HTMLElement[] = [];
        if (strongNodes) {
            strongArray = Array.from(strongNodes);
        }

        if (nearestParent?.nodeName.toLowerCase() === "strong") {
            // add to strongArray
            strongArray.push(nearestParent);
        }
        console.log(strongArray);
        
    }

    private wrapWordsWithSpansWithComputedStyle(html: HTMLElement): string {
        

        // Array.from(html.childNodes).forEach(drawText);

        return "";
    }
}
