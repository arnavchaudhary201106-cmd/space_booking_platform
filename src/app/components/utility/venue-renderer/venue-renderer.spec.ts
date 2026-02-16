import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VenueRenderer } from './venue-renderer';

describe('VenueRenderer', () => {
  let component: VenueRenderer;
  let fixture: ComponentFixture<VenueRenderer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VenueRenderer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VenueRenderer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
