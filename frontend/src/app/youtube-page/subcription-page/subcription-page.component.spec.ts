import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubcriptionPageComponent } from './subcription-page.component';

describe('SubcriptionPageComponent', () => {
  let component: SubcriptionPageComponent;
  let fixture: ComponentFixture<SubcriptionPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubcriptionPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubcriptionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
