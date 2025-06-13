import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StylePageComponent } from './style-page.component';

describe('StylePageComponent', () => {
  let component: StylePageComponent;
  let fixture: ComponentFixture<StylePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StylePageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StylePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
