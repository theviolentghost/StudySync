import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectFileWorkspaceComponent } from './select.file.workspace.component';

describe('SelectFileWorkspaceComponent', () => {
  let component: SelectFileWorkspaceComponent;
  let fixture: ComponentFixture<SelectFileWorkspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectFileWorkspaceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectFileWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
