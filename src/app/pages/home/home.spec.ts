import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('offers login to signed-out visitors and lists every venue', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('a[href="/login"]')).toBeTruthy();
    expect(page.querySelector('a[href="/events"]')).toBeNull();
    expect(page.querySelectorAll('app-venue-card').length).toBe(component.venues.length);
  });
});
