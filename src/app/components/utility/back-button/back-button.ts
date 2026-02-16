import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-back-button',
  imports: [MatIconModule],
  templateUrl: './back-button.html',
  styleUrl: './back-button.scss',
})
export class BackButton {
  constructor(public location: Location) {}
}
