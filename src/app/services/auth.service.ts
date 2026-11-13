import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';
import { API_BASE_URL } from '../constants/api';
import { LoginResponse, User } from '../models/auth.model';

const STORAGE_KEY = 'sbp.session';

export const LOGIN_URL = `${API_BASE_URL}/auth/login`;
export const REFRESH_URL = `${API_BASE_URL}/auth/refresh-token`;
export const LOGOUT_URL = `${API_BASE_URL}/auth/logout`;

interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<Session | null>(this.restore());
  // The refresh call in progress, if any. Every request that gets a 401 meanwhile waits on this one.
  private refreshing?: Observable<string>;

  readonly user = computed(() => this.session()?.user ?? null);
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);
  readonly refreshToken = computed(() => this.session()?.refreshToken ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);
  /** Super admins and admins can change data and create users; viewers are read-only. */
  readonly canManage = computed(() => {
    const role = this.user()?.role;
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  });

  constructor(private http: HttpClient) {
    // Keep tabs in step: a login, refresh or logout in one tab updates the others.
    globalThis.addEventListener?.('storage', (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        this.session.set(this.restore());
      }
    });
  }

  login(identifier: string, password: string): Observable<LoginResponse> {
    // `identifier` is the username or the email; the server tells them apart.
    return this.http
      .post<LoginResponse>(LOGIN_URL, { identifier, password })
      .pipe(tap((response) => this.start(response)));
  }

  /** Changes the signed-in user's password. The server returns a new token pair and revokes the old ones. */
  changePassword(currentPassword: string, newPassword: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/change-password`, {
        currentPassword,
        newPassword,
      })
      .pipe(tap((response) => this.start(response)));
  }

  /**
   * Gets a new access token with the refresh token and returns it.
   * Calls made while a refresh is running share it, so only one request is sent
   * (refresh tokens work once) and every caller gets the same new token.
   */
  refreshAccessToken(): Observable<string> {
    if (this.refreshing) {
      return this.refreshing;
    }

    const refreshToken = this.refreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }

    this.refreshing = this.http.post<LoginResponse>(REFRESH_URL, { refreshToken }).pipe(
      tap((response) => this.start(response)),
      map((response) => response.accessToken),
      finalize(() => (this.refreshing = undefined)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.refreshing;
  }

  /** Signs out: revokes the refresh token on the server (best effort) and clears the session. */
  logout() {
    const refreshToken = this.refreshToken();
    this.clearSession();

    if (refreshToken) {
      this.http.post(LOGOUT_URL, { refreshToken }).subscribe({ error: () => {} });
    }
  }

  /** Clears the stored session without telling the server (used when the server already rejected it). */
  clearSession() {
    this.session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable; the in-memory session is already cleared.
    }
  }

  private start(response: LoginResponse) {
    const session: Session = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    };
    this.session.set(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage unavailable; the user stays signed in until the page is reloaded.
    }
  }

  private restore(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const session = raw ? (JSON.parse(raw) as Session) : null;
      // Sessions saved before refresh tokens existed have no refreshToken and must log in again.
      return session?.accessToken && session.refreshToken && session.user?.role ? session : null;
    } catch {
      return null;
    }
  }
}
