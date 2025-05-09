import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolsCollaboratorsComponent } from './tools.collaborators.component';

describe('ToolsCollaboratorsComponent', () => {
  let component: ToolsCollaboratorsComponent;
  let fixture: ComponentFixture<ToolsCollaboratorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolsCollaboratorsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToolsCollaboratorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
