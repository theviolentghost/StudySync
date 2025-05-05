import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorConsoleComponent } from './editor.console.component';

describe('EditorConsoleComponent', () => {
  let component: EditorConsoleComponent;
  let fixture: ComponentFixture<EditorConsoleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorConsoleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditorConsoleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
