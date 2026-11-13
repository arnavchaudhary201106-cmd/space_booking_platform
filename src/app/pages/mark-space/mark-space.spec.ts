import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkSpace } from './mark-space';

describe('MarkSpace', () => {
  let component: MarkSpace;
  let fixture: ComponentFixture<MarkSpace>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarkSpace],
    }).compileComponents();

    fixture = TestBed.createComponent(MarkSpace);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
