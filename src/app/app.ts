import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { LoaderService } from './services/loader.service';
import { Navbar } from './components/layout/navbar/navbar';
import { Loader } from './components/utility/loader/loader';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, Navbar, Loader],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('space_booking_platform');

  constructor(public loaderService: LoaderService) {}
}
