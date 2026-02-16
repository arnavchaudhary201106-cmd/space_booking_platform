import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { EMPTY, Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { LoaderService } from '../services/loader.service';
import { VenueLayout } from '../models/venue.model';

export const venuLayoutResolver: ResolveFn<Observable<any>> = (route: ActivatedRouteSnapshot) => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const loaderService = inject(LoaderService);
  const venueId = route.queryParams['venueId'];

  if (!venueId) {
    router.navigateByUrl('/error');
    return EMPTY;
  }

  // Showing the global loader.
  loaderService.show();

  return http.get<VenueLayout>(`layouts/${venueId}.json`).pipe(
    finalize(() => {
      // Hiding the loader after API call completion.
      loaderService.hide();
    }),
    catchError(() => {
      router.navigateByUrl('/error');
      return EMPTY;
    }),
  );
};
