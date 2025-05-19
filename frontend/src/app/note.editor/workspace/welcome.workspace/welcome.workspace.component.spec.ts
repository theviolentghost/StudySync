import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeWorkspaceComponent } from './welcome.workspace.component';

describe('WelcomeWorkspaceComponent', () => {
  let component: WelcomeWorkspaceComponent;
  let fixture: ComponentFixture<WelcomeWorkspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeWorkspaceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WelcomeWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
