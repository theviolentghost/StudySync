import { Component, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'cursor',
  imports: [],
  templateUrl: './cursor.component.html',
  styleUrl: './cursor.component.css'
})
export class CursorComponent implements AfterViewInit, OnDestroy {
    private targetElement: HTMLElement | null = null;

    ngAfterViewInit(): void {
        window.addEventListener("mousemove", this.onMouseMove.bind(this));
        window.addEventListener("scroll", this.onScroll.bind(this));
        window.addEventListener("resize", this.onResize.bind(this));

        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.elementRef.nativeElement.style.setProperty("--color", "transparent"); // hide cursor on navigation
            this.attachListenersToCustomCursorElements();
        });

        // initial
        this.attachListenersToCustomCursorElements();
    }

    refresh_view() {
        this.elementRef.nativeElement.style.setProperty("--color", "transparent"); // hide cursor on navigation
        this.attachListenersToCustomCursorElements();
    }

    private attachListenersToCustomCursorElements() {
        const elements = document.querySelectorAll('[data-custom-cursor-scrollable="true"]');
        elements.forEach(el => {
            el.addEventListener('scroll', this.onScroll.bind(this));
        });
    }

    ngOnDestroy(): void {
        window.removeEventListener("mousemove", this.onMouseMove.bind(this));
        window.removeEventListener("scroll", this.onScroll.bind(this));
        window.removeEventListener("resize", this.onResize.bind(this));
    }

    constructor(private elementRef: ElementRef, private router: Router) {}

    private onMouseMove(event: MouseEvent) {
        const targetElement = event.target as HTMLElement;
        if(!(targetElement.getAttribute("data-allow-custom-cursor") === "true")) {
            this.elementRef.nativeElement.style.setProperty('--transition-delay', '0.5s');
            this.elementRef.nativeElement.style.setProperty("--color", "transparent");

            this.targetElement = null;
            return;
        }

        this.targetElement = targetElement;
        this.elementRef.nativeElement.style.setProperty('--transition-delay', '0s');
        this.elementRef.nativeElement.style.setProperty('--transition-position-time', '0.15s');

        this.applyTo(targetElement);
    }
    private onResize() {
        this.elementRef.nativeElement.style.setProperty("--width", `0px`);
        this.elementRef.nativeElement.style.setProperty("--height", `0px`);
    }
    private onScroll() {
        if(!this.targetElement) return;

        this.elementRef.nativeElement.style.setProperty('--transition-position-time', '0s');
        this.applyTo(this.targetElement);
    }
    private applyTo(element: HTMLElement): void {
        const rect = element.getBoundingClientRect();
        this.elementRef.nativeElement.style.setProperty("--color", element?.getAttribute("data-custom-cursor-color") || "var(--color-primary)");
        this.elementRef.nativeElement.style.setProperty("--width", `${rect.width || 0}px`);
        this.elementRef.nativeElement.style.setProperty("--height", `${rect.height || 0}px`);
        this.elementRef.nativeElement.style.setProperty("--cursor-thickness", `${element?.getAttribute("data-custom-cursor-thickness") || 4}px`);
        this.elementRef.nativeElement.style.setProperty("--cursor-margin", `${element?.getAttribute("data-custom-cursor-margin") || 4}px`);
        this.elementRef.nativeElement.style.setProperty("--z-index", `${element?.getAttribute("data-custom-cursor-z-index") || 99995}`);

        this.elementRef.nativeElement.style.left = `${rect.left}px`;
        this.elementRef.nativeElement.style.top = `${rect.top}px`;
    }
}
