import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolsFilesComponent } from './tools.files.component';

describe('ToolsFilesComponent', () => {
  let component: ToolsFilesComponent;
  let fixture: ComponentFixture<ToolsFilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolsFilesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToolsFilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
