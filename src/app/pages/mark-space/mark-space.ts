import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgClass, NgStyle } from '@angular/common';
import { Title } from '@angular/platform-browser';
import panzoom, { PanZoom } from 'panzoom';
import { VenueRenderer } from '../../components/utility/venue-renderer/venue-renderer';
import { BackButton } from '../../components/utility/back-button/back-button';
import { MIN_ZOOM, MAX_ZOOM, METERS_TO_PIXELS } from '../../constants/venue-layout';
import { CursorMode } from '../../models/cursor-mode.model';
import { VenueLayout } from '../../models/venue.model';

@Component({
  selector: 'app-mark-space',
  imports: [NgStyle, NgClass, VenueRenderer, BackButton],
  templateUrl: './mark-space.html',
  styleUrl: './mark-space.scss',
})
export class MarkSpace implements OnInit, AfterViewInit {
  venueLayout!: VenueLayout;
  readonly CursorMode = CursorMode;
  currentCursorMode = CursorMode.drag;
  private panzoomInstance!: PanZoom;

  @ViewChild('panzoom') private panzoomRef!: ElementRef<HTMLDivElement>;
  @ViewChild('venueLayoutContainer') private venueLayoutContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild(VenueRenderer) private venueRenderer!: VenueRenderer;

  constructor(
    private title: Title,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.title.setTitle('Mark Space');
    this.venueLayout = this.route.snapshot.data['venueLayout'];
  }

  ngAfterViewInit() {
    this.initPanzoomFunctionality();
  }

  private initPanzoomFunctionality() {
    this.panzoomInstance = panzoom(this.panzoomRef.nativeElement, {
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomDoubleClickSpeed: 1,
      beforeMouseDown: () => {
        return this.currentCursorMode === CursorMode.draw;
      },
    });

    this.panzoomInstance.zoomAbs(40, 40, 0.5);

    const venueLayoutContainer = this.venueLayoutContainerRef.nativeElement;

    // Setting bounds for panzoom.
    this.panzoomInstance!.on('pan', () => {
      const { scale } = this.panzoomInstance!.getTransform();

      const bounds = {
        minX: -(this.venueLayout.length * METERS_TO_PIXELS * scale) + 100,
        maxX: venueLayoutContainer.offsetWidth - 100,
        minY: -(this.venueLayout.breadth * METERS_TO_PIXELS * scale) + 100,
        maxY: venueLayoutContainer.offsetHeight - 100,
      };

      const { x, y } = this.panzoomInstance!.getTransform();

      if (x < bounds.minX) {
        this.panzoomInstance!.moveTo(bounds.minX, y);
      } else if (x > bounds.maxX) {
        this.panzoomInstance!.moveTo(bounds.maxX, y);
      }

      if (y < bounds.minY) {
        this.panzoomInstance!.moveTo(x, bounds.minY);
      } else if (y > bounds.maxY) {
        this.panzoomInstance!.moveTo(x, bounds.maxY);
      }
    });
  }

  switchToDragMode() {
    this.currentCursorMode = CursorMode.drag;
  }

  switchToDrawMode() {
    this.currentCursorMode = CursorMode.draw;
  }

  zoomInLayout() {
    const { x, y, scale } = this.panzoomInstance!.getTransform();

    if (scale >= MAX_ZOOM) {
      return;
    }

    this.panzoomInstance!.smoothZoomAbs(x, y, scale + 0.125);
  }

  zoomOutLayout() {
    const { x, y, scale } = this.panzoomInstance!.getTransform();

    if (scale <= MIN_ZOOM) {
      return;
    }

    this.panzoomInstance!.smoothZoomAbs(x, y, scale - 0.125);
  }

  removeAllMarkedAreas() {
    if (!confirm('Are you sure you want to remove all marked areas?')) {
      return;
    }

    this.venueRenderer.removeAllMarkedAreas();
  }
}
