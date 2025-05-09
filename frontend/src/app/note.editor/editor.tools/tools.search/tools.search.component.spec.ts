import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolsSearchComponent } from './tools.search.component';

describe('ToolsSearchComponent', () => {
  let component: ToolsSearchComponent;
  let fixture: ComponentFixture<ToolsSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolsSearchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToolsSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
