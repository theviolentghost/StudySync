import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DrawingWorkspaceComponent } from './drawing.workspace.component';

describe('DrawingWorkspaceComponent', () => {
  let component: DrawingWorkspaceComponent;
  let fixture: ComponentFixture<DrawingWorkspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawingWorkspaceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DrawingWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
