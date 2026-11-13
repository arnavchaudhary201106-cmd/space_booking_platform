import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { EMPTY, Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { LoaderService } from '../services/loader.service';
import { StallService } from '../services/stall.service';
import { EventService } from '../services/event.service';
import { EventItem } from '../models/event.model';
import { Stall } from '../models/stall.model';

export interface EventData {
  event: EventItem;
  stalls: Stall[];
}

// Loads the event, its booked stalls for the eventId + venueId query params.
// Without an eventId the layout is only previewed, so there is nothing to load.
export const eventDataResolver: ResolveFn<Observable<EventData | null>> = (
  route: ActivatedRouteSnapshot,
) => {
  const router = inject(Router);
  const loaderService = inject(LoaderService);
  const eventService = inject(EventService);
  const stallService = inject(StallService);
  const { eventId, venueId } = route.queryParams;

  if (!eventId) {
    return of(null);
  }

  if (!/^\d+$/.test(eventId) || !/^\d+$/.test(venueId)) {
    router.navigateByUrl('/error');
    return EMPTY;
  }

  loaderService.show();

  return forkJoin({
    event: eventService.getById(Number(eventId)),
    stalls: stallService.getStalls(Number(eventId), Number(venueId)),
  }).pipe(
    finalize(() => loaderService.hide()),
    catchError(() => {
      router.navigateByUrl('/error');
      return EMPTY;
    }),
  );
};
