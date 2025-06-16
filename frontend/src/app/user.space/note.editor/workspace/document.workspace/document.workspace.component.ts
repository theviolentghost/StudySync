import {
    Component,
    AfterViewInit,
    ViewChildren,
    ViewChild,
    QueryList,
    OnInit,
    ElementRef,
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
    @ViewChildren('toolGroup') tool_group_elements!: QueryList<ElementRef>;
    @ViewChild('pageContent') page_content!: ElementRef;
    @ViewChild('scrollContent') scroll_content!: ElementRef;

    private mutation_observer: MutationObserver | null = null;
    private inactivity_time_till_save = 2000; // ms

    document_content = '<p>Your initial document content here...wdneifnei nfinfiwncinw icnwidniwnciwjdinwid nwicnwjdwjciwj hello heell htetx textje jsisjsj skksks</p>';

    private current_file_path: string | null = null;
    private document_changes = new Subject<string>();
    private auto_save_subscription: Subscription = new Subscription();
    private panel_resize_subscription: Subscription = new Subscription();
    private router_subscription: Subscription = new Subscription();

    saved_range: Range | null = null; // To save the range object before a button click

    tool_groups: ToolGroup[] = [
        {
            id: 'TextFormatting',
            collapseIcon: 'type-bold',
            collapsePriority: 1,
            active: false,
            tools: [
                { 
                    name: 'Bold', 
                    icon: 'type-bold', 
                    tooltip: 'Ctrl+B', 
                    active: false,
                    action: (element: HTMLElement) => this.bold_text(element)
                },
                { 
                    name: 'Italic', 
                    icon: 'type-italic', 
                    tooltip: 'Ctrl+I', 
                    active: false,
                    action: (element: HTMLElement) => this.italic_text(element),
                },
                { 
                    name: 'Underline', 
                    icon: 'type-underline', 
                    tooltip: 'Ctrl+U', 
                    active: false,
                    action: (element: HTMLElement) => this.underline_text(element),
                },
                { 
                    name: 'Strike', 
                    icon: 'type-strikethrough', 
                    tooltip: 'Ctrl+Shift+X', 
                    active: false,
                    action: (element: HTMLElement) => this.strikethrough_text(element),
                }
            ]
        },
        {
            id: 'TextStyles',
            collapseIcon: 'type-bold',
            collapsePriority: 1,
            active: false,
            tools: [
                { 
                    name: 'Character Color', 
                    icon: '', 
                    tooltip: '', 
                    active: false,
                    action: (element: HTMLElement) => this.color_text(element)
                },
                { 
                    name: 'Character Highlight Color', 
                    icon: '', 
                    tooltip: '', 
                    active: false,
                    action: (element: HTMLElement) => this.highlight_text(element),
                },
            ]
        },
        {
            id: 'Alignments',
            collapseIcon: 'align-justified',
            collapsePriority: 3,
            active: false,
            tools: [
                { 
                    name: 'Align Left', 
                    icon: 'align-left', 
                    tooltip: '', 
                    active: false,
                    action: (element: HTMLElement) => this.align_left(element),
                },
                { 
                    name: 'Align Center', 
                    icon: 'align-center', 
                    tooltip: '', 
                    active: false,
                    action: (element: HTMLElement) => this.align_center(element),
                },
                { 
                    name: 'Align Right', 
                    icon: 'align-right', 
                    tooltip: '',
                    active: false, 
                    action: (element: HTMLElement) => this.align_right(element),
                },
                { 
                    name: 'Align Justify', 
                    icon: 'align-justified', 
                    tooltip: '', 
                    active: false,
                    action: (element: HTMLElement) => this.align_justify(element),
                }
            ]
        },
        {
            id: 'Lists',
            collapseIcon: 'list-numbers',
            collapsePriority: 2,
            active: false,
            tools: [
                { 
                    name: 'Bullet List', 
                    icon: 'list', 
                    tooltip: '', 
                    active: false,
                    action: (element: HTMLElement) => this.bullet_list(element),
                },
                { 
                    name: 'Ordered List', 
                    icon: 'list-numbers', 
                    tooltip: '', 
                    active: false,
                    action: (element: HTMLElement) => this.ordered_list(element),
                },
                { 
                    name: 'Task List', 
                    icon: 'list-check', 
                    tooltip: '', 
                    active: false,
                    action: (element: HTMLElement) => this.task_list(element),
                }
            ]
        }
    ];

    constructor(
        private panel_resize_service: PanelResizeService,
        private router: Router,
        private route: ActivatedRoute,
        private file_manager: FileManagerService,
    ) {}

    ngOnInit() {
        this.current_file_path = this.route.snapshot.paramMap.get('filePath');
        //this.loadDocument();
        window.addEventListener('resize', this.check_all_tool_groups_collapse.bind(this));

        this.panel_resize_subscription.add(
            this.panel_resize_service.panelResized.subscribe((panel_event: PanelResizeEvent) => {
                this.check_all_tool_groups_collapse();
            })
        );
        
        this.router_subscription.add(
            this.router.events.pipe(
                filter(event => event instanceof NavigationStart)  // <-- Changed to NavigationStart
            ).subscribe((event: NavigationStart) => {
                // When navigation starts, save the CURRENT document
                if (this.current_file_path) {
                    this.save_document(this.get_text_content(), this.current_file_path);
                }
            })
        );
    
        // Handle successful navigation to update the current path
        this.router_subscription.add(
            this.router.events.pipe(
                filter(event => event instanceof NavigationEnd)
            ).subscribe(() => {
                // After navigation completes, update current path and load new document
                this.current_file_path = this.route.snapshot.paramMap.get('filePath');
                this.load_document();
            })
        ); 

        this.auto_save_subscription.add(
            this.document_changes.pipe(
                debounceTime(this.inactivity_time_till_save),  
                distinctUntilChanged() 
            ).subscribe(content => {
                this.save_document(content);
            })
        );
    }

    ngAfterViewInit() {
        const toolbar = document.querySelector('.tools-container');
        if (toolbar) {
            toolbar.addEventListener('mousedown', this.save_selection_before_button_click);
        }


        this.page_content.nativeElement.addEventListener('input', () => {
            const content = this.get_text_content();
            this.document_changes.next(content)
        });

        this.check_all_tool_groups_collapse();
        this.load_document();
    }
    
    ngOnDestroy() {
        const toolbar = document.querySelector('.tools-container');
        if (toolbar) {
            toolbar.removeEventListener('mousedown', this.save_selection_before_button_click);
        }
        if (this.mutation_observer) {
            this.mutation_observer.disconnect();
            this.mutation_observer = null;
        }
        this.panel_resize_subscription.unsubscribe();
        this.router_subscription.unsubscribe();
        this.auto_save_subscription.unsubscribe();

        window.removeEventListener('resize', this.check_all_tool_groups_collapse.bind(this));
    }

    private async load_document() {
        if (this.route.snapshot.paramMap.has('filePath')) {
            const file_path = this.route.snapshot.paramMap.get('filePath');
            const file_id = this.file_manager.get_file_id_by_path(file_path || '');
            console.log('Loading document from file:', file_id, file_path);
            const file_data = await this.file_manager.get_file_content(file_id || '');
            if (!file_data) return;

            const file_content = JSON.parse(file_data?.data);
            this.document_content = file_content?.text || '<p>Your initial document content here...</p>';
            this.page_content.nativeElement.innerHTML = this.document_content;
        }
    }

    private save_document(data: string, path: string | null = null) {
        if (!data || data.trim() === '') return;
        this.document_content = data;

        const file_path = path || this.current_file_path || '';
        const file_id = this.file_manager.get_file_id_by_path(file_path || '') || '';
        console.log('Saving document... ', file_id);
        this.file_manager.save_file(file_id, { text: this.document_content });
    }

    private get_text_content() {
        return this.page_content.nativeElement.innerHTML;
    }

    // ---------------------
    // FORMAT/STYLE METHODS:
    // ---------------------

    save_selection_before_button_click = (event: Event) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        this.saved_range = selection.getRangeAt(0).cloneRange();
    }

    private bold_text(element: HTMLElement) {
        if (!this.saved_range || this.saved_range.collapsed) return;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(this.saved_range);
        document.execCommand('bold');
    }

    private italic_text(element: HTMLElement) {
        if (!this.saved_range || this.saved_range.collapsed) return;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(this.saved_range);
        document.execCommand('italic');
    }

    private underline_text(element: HTMLElement) {
        if (!this.saved_range || this.saved_range.collapsed) return;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(this.saved_range);
        document.execCommand('underline');
    }

    private strikethrough_text(element: HTMLElement) {
        if (!this.saved_range || this.saved_range.collapsed) return;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(this.saved_range);
        document.execCommand('strikeThrough');
    }

    // ---------------------
    // ALIGNMENT METHODS:
    // ---------------------

    private align_left(element: HTMLElement) {
        if (!this.saved_range || this.saved_range.collapsed) return;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(this.saved_range);
        document.execCommand('justifyLeft');
    }

    private align_center(element: HTMLElement) {
        if (!this.saved_range || this.saved_range.collapsed) return;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(this.saved_range);
        document.execCommand('justifyCenter');
    }

    private align_right(element: HTMLElement) {
        if (!this.saved_range || this.saved_range.collapsed) return;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(this.saved_range);
        document.execCommand('justifyRight');
    }

    private align_justify(element: HTMLElement) {
        if (!this.saved_range || this.saved_range.collapsed) return;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(this.saved_range);
        document.execCommand('justifyFull');
    }

    // ---------------------
    // LIST METHODS:
    // ---------------------

    private bullet_list(element: HTMLElement) {
        if (!this.saved_range || this.saved_range.collapsed) return;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(this.saved_range);
        document.execCommand('insertUnorderedList');
    }

    private ordered_list(element: HTMLElement) {
        if (!this.saved_range || this.saved_range.collapsed) return;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(this.saved_range);
        document.execCommand('insertOrderedList');
    }

    private task_list(element: HTMLElement) {
        // There's no built-in execCommand for "task/check list".
        // You could implement a custom approach here, for example:
        console.log('Task List clicked - implement custom logic here');
    }

    // ---------------------
    // LIST METHODS:
    // ---------------------

    private color_text(element: HTMLElement) {
        if (!this.saved_range || this.saved_range.collapsed) return;
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(this.saved_range);
        const color = prompt('Enter text color (e.g., red, #ff0000):', 'red');
        if (color) {
            document.execCommand('foreColor', false, color);
        }
    }

    private highlight_text(element: HTMLElement) {

    }

    // ---------------------
    // TOOLBAR LAYOUT METHODS:
    // ---------------------

    get_tool_bar_space(element: HTMLElement, groups_length: number): number {
        const style = window.getComputedStyle(element);
        const padding_left = parseFloat(style.paddingLeft);
        const padding_right = parseFloat(style.paddingRight);
        const gap = parseFloat(style.gap) || 0;
        return element.clientWidth - padding_left - padding_right - (gap * (groups_length - 1)) - 20;
    }

    check_all_tool_groups_collapse() {
        const tool_groups_array = this.tool_group_elements.toArray().sort((a, b) => {
            const priorityA = parseInt(a.nativeElement.getAttribute('data-group-collapse-priority') || '0', 10);
            const priorityB = parseInt(b.nativeElement.getAttribute('data-group-collapse-priority') || '0', 10);
            return priorityA - priorityB;
        });


        let tool_groups_width = this.tool_group_elements.reduce((total, group) => {
            const el = group.nativeElement;
            el.classList.remove('collapsed');
            return total + el.clientWidth;
        }, 0);

        let tool_bar_space = this.get_tool_bar_space(document.querySelector('.tools-container') as HTMLElement, tool_groups_array.length);
        let index = 0;

        while (tool_groups_width > tool_bar_space && index < tool_groups_array.length) {
            const el = tool_groups_array[index++].nativeElement;
            tool_groups_width -= el.clientWidth;
            el.classList.add('collapsed');
            tool_groups_width += el.clientWidth;
        }
    }

    toggle_tool_group_collapse(element: HTMLElement) {
        const group_id = element.getAttribute('data-group-name');
        if (!group_id) return;
        const group = this.tool_groups.find(g => g.id === group_id);
        if (!group) return;

        group.active = !group.active;
    }
}
