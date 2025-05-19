import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileTypeNotKnownWorkspaceComponent } from './file-type-not-known.workspace.component';

describe('FileTypeNotKnownWorkspaceComponent', () => {
  let component: FileTypeNotKnownWorkspaceComponent;
  let fixture: ComponentFixture<FileTypeNotKnownWorkspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileTypeNotKnownWorkspaceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileTypeNotKnownWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
