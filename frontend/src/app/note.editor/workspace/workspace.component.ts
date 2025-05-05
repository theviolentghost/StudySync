import { Component, Input, OnChanges, SimpleChanges, OnInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tab } from '../editor.tabs/editor.tabs.component';
import { DocumentWorkspaceComponent } from './document.workspace/document.workspace.component';
import { DrawingWorkspaceComponent } from './drawing.workspace/drawing.workspace.component';
import { StudyWorkspaceComponent } from './study.workspace/study.workspace.component';

@Component({
  selector: 'workspace',
  imports: [
      CommonModule,
      DocumentWorkspaceComponent,
      DrawingWorkspaceComponent,
      StudyWorkspaceComponent
  ],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css'
})
export class WorkspaceComponent implements OnChanges, OnInit {
    @Input() tabs: any[] = [];
    @Input() activeTabId: string | null = null;

    activeTab: Tab | null = null;

    loadingElement: HTMLElement | null = null;

    constructor(private elementRef: ElementRef) {}

    ngOnInit() {
        this.activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
        this.loadingElement = this.elementRef.nativeElement.getElementsByClassName('loading-element')[0];

        // this.startLoadingFileAnimation();
    }

    startLoadingFileAnimation() {
        this.loadingElement?.classList.add('loading');
    }

    stopLoadingFileAnimation() {
        this.loadingElement?.classList.remove('loading');
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['activeTabId']) {
            this.activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
        }
    }

}
