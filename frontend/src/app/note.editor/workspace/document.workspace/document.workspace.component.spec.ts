import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentWorkspaceComponent } from './document.workspace.component';

describe('DocumentWorkspaceComponent', () => {
  let component: DocumentWorkspaceComponent;
  let fixture: ComponentFixture<DocumentWorkspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentWorkspaceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
