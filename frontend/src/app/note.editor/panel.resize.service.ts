import { Injectable, EventEmitter } from '@angular/core';

export interface PanelResizeEvent {
    panelId: string;
    width: number;
    minWidth: number,
    maxWidth: number;
    collapseTolerance: number;
    collapseWidth: number;
    sliderWidth: number;
    position: 'left' | 'right';
    priority: number;
    element: HTMLElement;
}

interface PanelData {
    width: number;
    minWidth: number;
    maxWidth: number;
    collapseTolerance: number;
    collapseWidth: number;
    sliderWidth: number;
    position: 'left' | 'right';
    priority: number;
    element: HTMLElement;
}

@Injectable({
    providedIn: 'root'
})

export class PanelResizeService {
    private _minimumWorkspaceWidth = 240; // Default value

    get minimumWorkspaceWidth(): number {
        return this._minimumWorkspaceWidth;
    }
    set minimumWorkspaceWidth(value: number) {
        this._minimumWorkspaceWidth = value;
        this.recalculatePanels();
    }
    private panels: Map<string, PanelData> = new Map();

    public panelResized = new EventEmitter<PanelResizeEvent>();

    private availableWidth: number = window.innerWidth;

    constructor() {
        window.addEventListener('resize', () => {
            this.availableWidth = window.innerWidth;
            this.recalculatePanels();
        });
    }

    onSliderDragStart(panelId: string): void {
        const panel = this.panels.get(panelId);
        if (!panel) return;

        panel.element.getElementsByClassName("window-slider")[0].classList.add('active');
    }

    onSliderDragEnd(panelId: string): void {
        const panel = this.panels.get(panelId);
        if (!panel) return;

        panel.element.getElementsByClassName("window-slider")[0].classList.remove('active');
    }

    registerPanel(panelData: PanelResizeEvent): void {
        this.panels.set(panelData.panelId, {
            width: panelData.width,
            minWidth: panelData.minWidth,
            maxWidth: panelData.maxWidth,
            collapseTolerance: panelData.collapseTolerance,
            collapseWidth: panelData.collapseWidth,
            sliderWidth: panelData.sliderWidth,
            position: panelData.position,
            priority: panelData.priority,
            element: panelData.element
        });
        this.resizePanel(panelData.panelId, panelData.width, false); // Set initial width
        this.recalculatePanels();
    }

    resizePanel(id: string, newWidth: number, recalculate: boolean = true): void {
        const panel = this.panels.get(id);
        if (!panel) return;

        const actualWidth = this.calculateConstrainedWidth(id, newWidth);

        panel.width = actualWidth;
        panel.element.style.width = `${actualWidth}px`;

        this.panelResized.emit({
            panelId: id,
            width: actualWidth,
            minWidth: panel.minWidth,
            maxWidth: panel.maxWidth,
            collapseTolerance: panel.collapseTolerance,
            collapseWidth: panel.collapseWidth,
            sliderWidth: panel.sliderWidth,
            position: panel.position,
            priority: panel.priority,
            element: panel.element
        });

        if(recalculate) this.recalculatePanels(id); // recalculate panels after resizing
    }
    private calculateConstrainedWidth(id: string, requestedWidth: number): number {
        const panel = this.panels.get(id);
        if (!panel) return requestedWidth;

        let roundedWidth = Math.round(requestedWidth);

        if(roundedWidth < panel.collapseWidth - panel.collapseTolerance) {
            roundedWidth = panel.minWidth;
        } 
        else if(roundedWidth < panel.collapseWidth) {
            roundedWidth = panel.collapseWidth;
        } 
        else if(roundedWidth > this.availableWidth && roundedWidth < panel.maxWidth + panel.sliderWidth) {
            roundedWidth = Math.round(this.availableWidth); // max 100% of the screen
        }
        else if(roundedWidth > panel.maxWidth) {
            roundedWidth = panel.maxWidth;
        }

        return roundedWidth;
    }

    get workspaceWidth(): number {
        return this.availableWidth - Array.from(this.panels.values()).reduce((total, panel) => {
            return total + panel.width;
        }, 0);
    }

    private recalculatePanels(priorityId?: string): void {
        const sortedPanels = Array.from(this.panels.entries()).sort((a, b) => {
            return a[1].priority - b[1].priority;
        }); 

        const totalRequestedWidth = sortedPanels.reduce((total, [id, panel]) => {
            return total + panel.width;
        }, 0) + this._minimumWorkspaceWidth;

        if(totalRequestedWidth > this.availableWidth) {
            let excessWidth = totalRequestedWidth - this.availableWidth;

            for(let [id, panel] of sortedPanels) {
                if(id === priorityId) continue;
                if(panel.width <= panel.minWidth) continue;

                

                const reduction = Math.min(excessWidth, panel.width - panel.minWidth );
                this.resizePanel(id, panel.width - reduction, false);

                if(excessWidth <= 0) break;
            }
        }
    }
}
