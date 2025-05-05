import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudyWorkspaceComponent } from './study.workspace.component';

describe('StudyWorkspaceComponent', () => {
  let component: StudyWorkspaceComponent;
  let fixture: ComponentFixture<StudyWorkspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudyWorkspaceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudyWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
