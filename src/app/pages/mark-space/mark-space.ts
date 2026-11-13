import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgClass, NgStyle } from '@angular/common';
import { Title } from '@angular/platform-browser';
import panzoom, { PanZoom } from 'panzoom';
import { VenueRenderer } from '../../components/utility/venue-renderer/venue-renderer';
import { BackButton } from '../../components/utility/back-button/back-button';
import { MIN_ZOOM, MAX_ZOOM, METERS_TO_PIXELS } from '../../constants/venue-layout';
import { CursorMode } from '../../models/cursor-mode.model';
import { VenueLayout } from '../../models/venue.model';
import { BorderRef, Stall, StallCell } from '../../models/stall.model';
import { StallService } from '../../services/stall.service';
import { MatDialog } from '@angular/material/dialog';
import { BookingDialog } from '../../components/utility/booking-dialog/booking-dialog';
import { EventData } from '../../resolvers/event-data.resolver';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mark-space',
  imports: [NgStyle, NgClass, VenueRenderer, BackButton],
  templateUrl: './mark-space.html',
  styleUrl: './mark-space.scss',
})
export class MarkSpace implements OnInit, AfterViewInit {
  venueLayout!: VenueLayout;
  bookedStalls: Stall[] = [];
  eventName = '';
  readonly auth = inject(AuthService);
  errorMessage = '';
  eventId?: number;
  venueId!: number;
  readonly CursorMode = CursorMode;
  currentCursorMode = CursorMode.drag;
  private panzoomInstance!: PanZoom;

  @ViewChild('panzoom') private panzoomRef!: ElementRef<HTMLDivElement>;
  @ViewChild('venueLayoutContainer') private venueLayoutContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild(VenueRenderer) private venueRenderer!: VenueRenderer;

  constructor(
    private title: Title,
    private route: ActivatedRoute,
    private stallService: StallService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.title.setTitle('Mark Space');
    this.venueLayout = this.route.snapshot.data['venueLayout'];
    const eventData: EventData | null = this.route.snapshot.data['eventData'];
    this.bookedStalls = eventData?.stalls ?? [];
    this.eventName = eventData?.event.name ?? '';

    const { eventId, venueId } = this.route.snapshot.queryParams;
    this.venueId = Number(venueId);
    this.eventId = eventId ? Number(eventId) : undefined;
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

  switchToViewMode() {
    this.currentCursorMode = CursorMode.view;
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

  bookStall({ groupId, cells }: { groupId: number; cells: StallCell[] }) {
    if (this.eventId === undefined) {
      return;
    }

    this.errorMessage = '';
    const { cellWidth, cellHeight } = this.venueLayout.layoutData;

    this.dialog
      .open(BookingDialog, {
        width: '32rem',
        maxWidth: '95vw',
        data: {
          eventId: this.eventId,
          venueId: this.venueId,
          eventName: this.eventName,
          venueName: this.venueLayout.name,
          cells,
          area: Math.round(cells.length * cellWidth * cellHeight * 100) / 100,
        },
      })
      .afterClosed()
      .subscribe((stall?: Stall) => {
        if (stall) {
          this.venueRenderer.markGroupAsBooked(groupId, stall);
        }
      });
  }

  deleteStall(stall: Stall) {
    if (
      this.eventId === undefined ||
      !confirm(`Delete stall "${stall.stallName}"? This cannot be undone.`)
    ) {
      return;
    }

    this.errorMessage = '';

    this.stallService.deleteStall(this.eventId, this.venueId, stall.id).subscribe({
      next: () => this.venueRenderer.removeBookedStall(stall.id),
      error: (err) => {
        this.errorMessage = err?.error?.detail || 'Could not delete the stall. Please try again.';
      },
    });
  }

  // Persists opened/closed borders of a booked stall; undoes the change if the request fails.
  updateBorders(change: { stall: Stall; open: boolean; borders: BorderRef[]; revert: () => void }) {
    this.errorMessage = '';

    this.stallService
      .updateBorders(this.eventId!, this.venueId, change.stall.id, change.open, change.borders)
      .subscribe({
        error: (err) => {
          change.revert();
          this.errorMessage =
            err?.error?.detail || 'Could not update the border. Please try again.';
        },
      });
  }
}
