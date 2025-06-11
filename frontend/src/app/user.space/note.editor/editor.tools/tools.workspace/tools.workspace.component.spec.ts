import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolsWorkspaceComponent } from './tools.workspace.component';

describe('ToolsWorkspaceComponent', () => {
  let component: ToolsWorkspaceComponent;
  let fixture: ComponentFixture<ToolsWorkspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolsWorkspaceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToolsWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
