import { Routes } from '@angular/router';

import { venuLayoutResolver } from './resolvers/venue-layout.resolver';
import { eventDataResolver } from './resolvers/event-data.resolver';

import { Home } from './pages/home/home';
import { Venues } from './pages/venues/venues';
import { Events } from './pages/events/events';
import { MarkSpace } from './pages/mark-space/mark-space';
import { Login } from './pages/login/login';
import { ChangePassword } from './pages/change-password/change-password';
import { CreateUser } from './pages/create-user/create-user';
import { authGuard, adminGuard, guestGuard } from './guards/auth.guard';
import { Error } from './pages/error/error';
import { PageNotFound } from './pages/page-not-found/page-not-found';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard],
  },
  {
    path: 'change-password',
    component: ChangePassword,
    canActivate: [authGuard],
  },
  {
    path: 'create-user',
    component: CreateUser,
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'venues',
    component: Venues,
    canActivate: [authGuard],
  },
  {
    path: 'events',
    component: Events,
    canActivate: [authGuard],
  },
  {
    // Query params: venueId (required), eventId (optional; stalls are saved against it).
    path: 'mark-space',
    canActivate: [authGuard],
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
