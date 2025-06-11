import { Component, Input } from '@angular/core';

@Component({
  selector: 'header-button',
  imports: [],
  templateUrl: './header.button.component.html',
  styleUrl: './header.button.component.css'
})
export class HeaderButtonComponent {
    @Input() name: string = "BtnName";
    @Input() icon: string = "null";
    @Input() action?: () => void = () => { console.log("Button clicked"); };
}
