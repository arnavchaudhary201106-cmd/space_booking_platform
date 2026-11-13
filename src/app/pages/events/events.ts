import { Component, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { EventCard } from '../../components/utility/event-card/event-card';
import { EventFormDialog } from '../../components/utility/event-form-dialog/event-form-dialog';
import { EventItem } from '../../models/event.model';
import { EventService } from '../../services/event.service';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-events',
  imports: [EventCard, MatProgressSpinnerModule],
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class Events implements OnInit {
  readonly events = signal<EventItem[]>([]);
  readonly isLoading = signal(true);
  readonly hasLoaded = signal(false);
  readonly errorMessage = signal('');

  constructor(
    private title: Title,
    private dialog: MatDialog,
    private eventService: EventService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit() {
    this.title.setTitle('Events');
    this.loadEvents();
  }

  loadEvents() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.eventService
      .getAll()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (events) => {
          this.events.set(events);
          this.hasLoaded.set(true);
        },
        error: () => this.errorMessage.set('Could not load events. Is the backend running?'),
      });
  }

  openForm(event?: EventItem) {
    this.dialog
      .open(EventFormDialog, { width: '36rem', maxWidth: '95vw', data: { event } })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.loadEvents();
        }
      });
  }

  deleteEvent(event: EventItem) {
    if (!confirm(`Delete "${event.name}" and all of its marked stalls?`)) {
      return;
    }

    this.loaderService.show();

    this.eventService
      .delete(event.id)
      .pipe(finalize(() => this.loaderService.hide()))
      .subscribe({
        next: () => this.loadEvents(),
        error: () => this.errorMessage.set('Could not delete the event. Please try again.'),
      });
  }
}
