import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { PanelResizeService } from '../panel.resize.service';

@Component({
  selector: 'editor-console',
  imports: [],
  templateUrl: './editor.console.component.html',
  styleUrl: './editor.console.component.css'
})
export class EditorConsoleComponent implements OnInit {
    private panelId = 'consolePanel';

    resizing: boolean = false;
    positionDragOffset: number = 0;
    defaultWindowWidth: number = 0;
    windowMinWidth: number = 0;
    windowMaxWidth: number = 9999; 
    collapseTolerance: number = 95; 
    collapseWidth: number = 170; // minimum width of the tool extension window px
    sliderWidth: number = 0; // width of the slider px

    constructor(
      private elementRef: ElementRef,
      private panelResizeService: PanelResizeService
    ) {}

    ngOnInit(): void {
        this.setCSSvariables();

        // Set initial width
        this.panelResizeService.registerPanel({
            panelId: this.panelId,
            width: this.defaultWindowWidth,
            minWidth: this.windowMinWidth,
            maxWidth: this.windowMaxWidth,
            collapseTolerance: this.collapseTolerance,
            collapseWidth: this.collapseWidth,
            sliderWidth: this.sliderWidth,
            position: "right",
            priority: 2,
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

            document.addEventListener('touchmove', this.onTouchMove.bind(this));
            document.addEventListener('touchend', this.onTouchEnd.bind(this));
        }
    }
    onStart(clientX: number) {
        this.positionDragOffset = clientX - (this.elementRef.nativeElement.getBoundingClientRect().left || 0);

        this.resizing = true;
        this.panelResizeService.onSliderDragStart(this.panelId);
    }

    onMouseMove(event: MouseEvent) {
        if(this.resizing) {
            this.setWidth(window.innerWidth - event.clientX + this.positionDragOffset);
        }
    }
    onTouchMove(event: TouchEvent) {
        if(this.resizing) {
            const touch = event.touches[0];
            this.setWidth(window.innerWidth - touch.clientX + this.positionDragOffset);
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
    setCSSvariables(): void {
        this.sliderWidth = Math.ceil(parseFloat(this.getGlobalCSSVariable('--slider-thickness'))) || 0;
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
