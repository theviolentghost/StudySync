import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PanelResizeService } from '../panel.resize.service';
import { ToolsWorkspaceComponent } from './tools.workspace/tools.workspace.component';
import { ToolsFilesComponent } from './tools.files/tools.files.component';
import { ToolsCollaboratorsComponent } from './tools.collaborators/tools.collaborators.component';
import { ToolsSearchComponent } from './tools.search/tools.search.component';

interface Tool {
    id: string;
    name: string;
    icon: string;
    action?: () => void;
    darkIcon?: boolean;
}

@Component({
  selector: 'editor-tools',
  imports: [
    CommonModule,
    ToolsWorkspaceComponent,
    ToolsFilesComponent,
    ToolsCollaboratorsComponent,
    ToolsSearchComponent,
  ],
  templateUrl: './editor.tools.component.html',
  styleUrl: './editor.tools.component.css'
})
export class EditorToolsComponent implements OnInit {
    private panelId = 'editorTools';

    resizing: boolean = false;
    positionDragOffset: number = 0;
    defaultWindowWidth: number = 180; // default

    toolWindowMinWidth: number = 60; // minimum width of the tool extension window px 
    toolWindowMaxWidth: number = 500; // maximum width of the tool extension window px
    toolExtensionTolerance: number = 90; // distance the mouse must exceed to trigger a collapse of tool extension window px
    toolExtensionMinWidth: number = this.toolWindowMinWidth + 120; // minimum width of the tool extension window px
    sliderWidth: number = 0; // width of the slider px

    toolList: Tool[] = [
        { id: 'workspace', name: 'Workspace', icon: 'tools' },
        { id: 'files', name: 'Files', icon: 'files' },
        { id: 'collaborators', name: 'Collaborators', icon: 'people-fill'  },
        { id: 'search', name: 'Search', icon: 'file-search'},
        { id: 'todo', name: 'To-Do', icon: 'null'},
    ]; 
    activeToolId: string = 'files'; // default
    headerTitle: string = this.toolList[1].name;


    constructor(
        private elementRef: ElementRef,
        private panelResizeService: PanelResizeService
    ) {}

    ngOnInit(): void {
        // Set initial width
        this.panelResizeService.registerPanel({
            panelId: this.panelId,
            width: this.defaultWindowWidth,
            minWidth: this.toolWindowMinWidth,
            maxWidth: this.toolWindowMaxWidth,
            collapseTolerance: this.toolExtensionTolerance,
            collapseWidth: this.toolExtensionMinWidth,
            sliderWidth: this.sliderWidth,
            position: "left",
            priority: 1,
            element: this.elementRef.nativeElement
        });
    }

    @HostListener('mousedown', ['$event'])
    onMouseDown(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if(target.classList.contains('window-slider')) {
            this.onStart(event.clientX);

            document.addEventListener('mousemove', this.onMouseMove.bind(this));
            document.addEventListener('mouseup', this.onMouseUp.bind(this));
        }
    }
    @HostListener('touchstart', ['$event'])
    onTouchStart(event: TouchEvent) {
        const target = event.target as HTMLElement;
        if(target.classList.contains('window-slider')) {
            this.onStart(event.touches[0].clientX);
            event.preventDefault();

            document.addEventListener('touchmove', this.onTouchMove.bind(this));
            document.addEventListener('touchend', this.onTouchEnd.bind(this));
        }
    }
    onStart(clientX: number) {
        this.positionDragOffset = (this.elementRef.nativeElement.getBoundingClientRect().right || 0) - clientX;

        this.resizing = true;
        this.panelResizeService.onSliderDragStart(this.panelId);
    }

    onMouseMove(event: MouseEvent) {
        if(this.resizing) {
            this.setWidth(event.clientX + this.positionDragOffset);
        }
    }
    onTouchMove(event: TouchEvent) {
        if(this.resizing) {
            const touch = event.touches[0];
            this.setWidth(touch.clientX + this.positionDragOffset);
            event.preventDefault();
        }
    }

    setWidth (width: number) {
        this.panelResizeService.resizePanel(this.panelId, width);
    }

    onMouseUp(event: MouseEvent) {
        if(this.resizing) {
            this.onEnd();
            document.removeEventListener('mousemove', this.onMouseMove.bind(this));
            document.removeEventListener('mouseup', this.onMouseUp.bind(this));
        }
    }
    onTouchEnd(event: TouchEvent) {
        if(this.resizing) {
            this.onEnd();
            document.removeEventListener('touchmove', this.onTouchMove.bind(this));
            document.removeEventListener('touchend', this.onTouchEnd.bind(this));
        }
    }
    onEnd() {
        this.resizing = false;
        this.panelResizeService.onSliderDragEnd(this.panelId);
    }
    // to remove vvvv
    setCSSvariables(): void {
        this.sliderWidth = Math.ceil(parseFloat(this.getGlobalCSSVariable('--slider-thickness'))) || 0;
        this.toolWindowMinWidth = Math.ceil(parseFloat(this.getLocalCSSVariable('--tool-bar-width'))) || 0;
    }
    getGlobalCSSVariable(variableName: string): string {
        const rootStyles = getComputedStyle(document.documentElement);
        return rootStyles.getPropertyValue(variableName).trim();
    }
    getLocalCSSVariable(variableName: string): string {
        const elementStyles = getComputedStyle(this.elementRef.nativeElement);
        return elementStyles.getPropertyValue(variableName).trim();
    }
}
