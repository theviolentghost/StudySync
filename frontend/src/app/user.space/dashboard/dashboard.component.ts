import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';

import { NavigationComponent } from '../navigation/navigation.component';

@Component({
  selector: 'user-dashboard',
  imports: [
    RouterOutlet,
    RouterModule,
    NavigationComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

}
