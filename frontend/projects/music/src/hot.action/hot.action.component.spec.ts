import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HotActionComponent } from './hot.action.component';

describe('HotActionComponent', () => {
  let component: HotActionComponent;
  let fixture: ComponentFixture<HotActionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HotActionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HotActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
