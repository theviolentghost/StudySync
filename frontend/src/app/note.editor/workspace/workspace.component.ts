import { Component, Input, OnChanges, SimpleChanges, OnInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute, NavigationEnd } from '@angular/router';

@Component({
  selector: 'workspace',
  standalone: true,
  imports: [
      CommonModule,
      RouterModule,
  ],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css'
})
export class WorkspaceComponent implements OnInit {
    @Input() files: File[] = [];

    loadingElement: HTMLElement | null = null;

    currentFileType: string | null = null;
    currentFileId: string | null = null;

    constructor(
        private elementRef: ElementRef,
        private router: Router, 
        private route: ActivatedRoute 
    ) {}

    ngOnInit() {
        // this.activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
        this.loadingElement = this.elementRef.nativeElement.getElementsByClassName('loading-element')[0];
    }

    startLoadingFileAnimation() {
        this.loadingElement?.classList.add('loading');
    }

    stopLoadingFileAnimation() {
        this.loadingElement?.classList.remove('loading');
    }

    // ngOnChanges(changes: SimpleChanges) {
    //     if (changes['activeTabId']) {
    //         const previousTab = this.activeTab;
    //         this.activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
            
    //         // Only update if the tab actually changed
    //         if (this.activeTab?.id !== previousTab?.id) {
    //             this.updateCurrentFile(this.activeTab);
    //         }
    //     }
    // }

}
