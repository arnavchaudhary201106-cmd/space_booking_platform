import { Routes } from '@angular/router';

import { venuLayoutResolver } from './resolvers/venue-layout.resolver';
import { eventDataResolver } from './resolvers/event-data.resolver';

import { Home } from './pages/home/home';
import { Venues } from './pages/venues/venues';
import { Events } from './pages/events/events';
import { MarkSpace } from './pages/mark-space/mark-space';
import { Error } from './pages/error/error';
import { PageNotFound } from './pages/page-not-found/page-not-found';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'venues',
    component: Venues,
  },
  {
    path: 'events',
    component: Events,
  },
  {
    // Query params: venueId (required), eventId (optional; stalls are saved against it).
    path: 'mark-space',
    resolve: { venueLayout: venuLayoutResolver, eventData: eventDataResolver },
    component: MarkSpace,
  },
  {
    path: 'error',
    component: Error,
  },
  {
    path: '**',
    component: PageNotFound,
  },
];
