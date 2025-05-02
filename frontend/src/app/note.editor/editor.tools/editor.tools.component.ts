import { Component, ElementRef, HostListener } from '@angular/core';

@Component({
  selector: 'editor-tools',
  imports: [],
  templateUrl: './editor.tools.component.html',
  styleUrl: './editor.tools.component.css'
})
export class EditorToolsComponent {
    resizeElement: HTMLElement | null;
    resizing: boolean = false;
    windowWidth: number = 200;

    toolList: any = []; // Placeholder for tool list
    toolListWidth: number = 100; // default px
    toolExtensionMinWidth: number = 80; // minimum width of the tool extension window px 
    toolExtensionTolerance: number = 10; // distance the mouse must exceed to trigger a collapse of tool extension window px

    constructor(private elementRef: ElementRef) {
        // Set initial width
        this.setWidth(this.windowWidth);
        this.resizeElement = this.elementRef.nativeElement.getElementsByClassName('tool-workspace-slider')[0];
    }

    @HostListener('mousedown', ['$event'])
    onMouseDown(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if(target.classList.contains('tool-workspace-slider')) {
            this.resizing = true;

            document.addEventListener('mousemove', this.onMouseMove.bind(this));
            document.addEventListener('mouseup', this.onMouseUp.bind(this));
        }
    }
    @HostListener('touchstart', ['$event'])
    onTouchStart(event: TouchEvent) {
        const target = event.target as HTMLElement;
        if(target.classList.contains('tool-workspace-slider')) {
            this.resizing = true;
            this.resizeElement?.classList.add("active");
            alert(this.resizeElement);

            document.addEventListener('touchmove', this.onTouchMove.bind(this));
            document.addEventListener('touchend', this.onTouchEnd.bind(this));
        }
    }

    onMouseMove(event: MouseEvent) {
        if(this.resizing) {
            this.setWidth(event.clientX);
        }
    }
    onTouchMove(event: TouchEvent) {
        if(this.resizing) {
            const touch = event.touches[0];
            this.setWidth(touch.clientX);
        }
    }

    setWidth (width: number) {
        let roundedWidth = Math.round(width);
        if(roundedWidth < this.toolListWidth + this.toolExtensionMinWidth - this.toolExtensionTolerance) {
            roundedWidth = this.toolListWidth;
        }

        this.windowWidth = roundedWidth;
        //apply the width to :host
        this.elementRef.nativeElement.style.width = `${this.windowWidth}px`;
    }

    onMouseUp(event: MouseEvent) {
        if(this.resizing) {
            this.resizing = false;
            document.removeEventListener('mousemove', this.onMouseMove.bind(this));
            document.removeEventListener('mouseup', this.onMouseUp.bind(this));
        }
    }
    onTouchEnd(event: TouchEvent) {
        if(this.resizing) {
            this.resizing = false;
            this.resizeElement?.classList.remove("active");
            document.removeEventListener('touchmove', this.onTouchMove.bind(this));
            document.removeEventListener('touchend', this.onTouchEnd.bind(this));
        }
    }
}
