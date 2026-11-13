import { HttpErrorResponse, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { API_BASE_URL } from '../constants/api';
import { AuthService, LOGIN_URL, LOGOUT_URL, REFRESH_URL } from '../services/auth.service';

// Calls that never carry a bearer token and must not trigger a refresh when they fail.
const PUBLIC_URLS = [LOGIN_URL, REFRESH_URL, LOGOUT_URL];

/**
 * Adds the access token to API calls. When one comes back 401 (expired token) it refreshes the
 * token once and re-sends the call with the new token. Calls that fail while the refresh is
 * running wait for it and are re-sent with the same new token. If the refresh fails, the user
 * is signed out and sent to the login page.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!req.url.startsWith(API_BASE_URL) || PUBLIC_URLS.includes(req.url)) {
    return next(req);
  }

  const sendWith = (token: string | null): Observable<HttpEvent<unknown>> =>
    next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);

  const sessionExpired = () => {
    // Only the first failing call does this; the rest find the session already gone.
    if (auth.isLoggedIn()) {
      const returnUrl = router.url;
      auth.clearSession();
      router.navigate(['/login'], {
        queryParams: returnUrl && !returnUrl.startsWith('/login') ? { returnUrl } : {},
      });
    }
  };

  const usedToken = auth.accessToken();

  return sendWith(usedToken).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Nothing to refresh with: the session is over.
      if (!auth.refreshToken()) {
        sessionExpired();
        return throwError(() => error);
      }

      // If the token was already replaced (by another request or another tab) while this call
      // was in flight, just retry with the current one instead of refreshing again.
      const currentToken = auth.accessToken();
      const newToken$ =
        currentToken && currentToken !== usedToken
          ? of(currentToken)
          : auth.refreshAccessToken().pipe(
              catchError((refreshError: HttpErrorResponse) => {
                // The refresh token was rejected (expired, already used or revoked).
                // Network and server errors keep the session so a later call can retry.
                if (refreshError.status === 400 || refreshError.status === 401) {
                  sessionExpired();
                }
                return throwError(() => refreshError);
              }),
            );

      return newToken$.pipe(
        switchMap((token) => sendWith(token)),
        catchError((retryError: HttpErrorResponse) => {
          // Still unauthorized with a brand new token: give up and sign in again.
          if (retryError.status === 401) {
            sessionExpired();
          }
          return throwError(() => retryError);
        }),
      );
    }),
  );
};
