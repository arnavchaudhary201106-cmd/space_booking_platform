import { Routes } from '@angular/router';

import { venuLayoutResolver } from './resolvers/venue-layout.resolver';

import { Home } from './pages/home/home';
import { MarkSpace } from './pages/mark-space/mark-space';
import { Error } from './pages/error/error';
import { PageNotFound } from './pages/page-not-found/page-not-found';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'mark-space',
    resolve: { venueLayout: venuLayoutResolver },
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
