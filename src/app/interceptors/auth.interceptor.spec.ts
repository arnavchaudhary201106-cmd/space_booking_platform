import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_BASE_URL } from '../constants/api';
import { LoginResponse } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

const USER = {
  id: 1,
  firstName: 'A',
  lastName: 'B',
  username: 'ab1',
  email: 'ab1@example.com',
  role: 'ADMIN' as const,
  createdAt: '2030-01-01T00:00:00Z',
};

const SESSION = { accessToken: 'old-access', refreshToken: 'old-refresh', user: USER };

const REFRESHED: LoginResponse = {
  accessToken: 'new-access',
  refreshToken: 'new-refresh',
  user: USER,
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.setItem('sbp.session', JSON.stringify(SESSION));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  const bearer = (token: string) => (req: { headers: { get(n: string): string | null } }) =>
    req.headers.get('Authorization') === `Bearer ${token}`;

  it('adds the access token to API calls only', () => {
    http.get(`${API_BASE_URL}/events`).subscribe();
    backend.expectOne(bearer('old-access')).flush([]);

    http.get('https://example.com/other').subscribe();
    const other = backend.expectOne('https://example.com/other');
    expect(other.request.headers.has('Authorization')).toBe(false);
    other.flush({});
  });

  it('refreshes once on 401 and re-sends every pending request with the new token', () => {
    const results: string[] = [];
    ['a', 'b', 'c'].forEach((name) =>
      http.get(`${API_BASE_URL}/${name}`).subscribe((body) => results.push(`${name}:${body}`)),
    );

    // All three go out with the old token and all three are rejected.
    const first = ['a', 'b', 'c'].map((name) => backend.expectOne(`${API_BASE_URL}/${name}`));
    first.forEach((req) => {
      expect(req.request.headers.get('Authorization')).toBe('Bearer old-access');
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
    });

    // Exactly one refresh call, using the refresh token.
    const refresh = backend.expectOne(`${API_BASE_URL}/auth/refresh-token`);
    expect(refresh.request.body).toEqual({ refreshToken: 'old-refresh' });
    expect(results).toEqual([]);
    refresh.flush(REFRESHED);

    // Every request is re-sent with the new access token.
    ['a', 'b', 'c'].forEach((name) => {
      const retry = backend.expectOne(`${API_BASE_URL}/${name}`);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
      retry.flush(`ok-${name}`);
    });

    expect(results.sort()).toEqual(['a:ok-a', 'b:ok-b', 'c:ok-c']);
    expect(auth.accessToken()).toBe('new-access');
    expect(auth.refreshToken()).toBe('new-refresh');
    expect(JSON.parse(localStorage.getItem('sbp.session')!).refreshToken).toBe('new-refresh');
  });

  it('re-sends a request that was rejected after the token was already refreshed without refreshing again', () => {
    let late = '';
    http.get(`${API_BASE_URL}/early`).subscribe();
    http.get(`${API_BASE_URL}/late`).subscribe((body) => (late = String(body)));

    const early = backend.expectOne(`${API_BASE_URL}/early`);
    const lateReq = backend.expectOne(`${API_BASE_URL}/late`);

    early.flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${API_BASE_URL}/auth/refresh-token`).flush(REFRESHED);
    backend.expectOne(`${API_BASE_URL}/early`).flush({});

    // Rejected only now, though it was sent with the old token.
    lateReq.flush({}, { status: 401, statusText: 'Unauthorized' });
    const retry = backend.expectOne(`${API_BASE_URL}/late`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
    retry.flush('done');
    backend.expectNone(`${API_BASE_URL}/auth/refresh-token`);
    expect(late).toBe('done');
  });

  it('signs the user out and goes to login when the refresh token is rejected', () => {
    const errors: number[] = [];
    ['a', 'b'].forEach((name) =>
      http.get(`${API_BASE_URL}/${name}`).subscribe({ error: (e) => errors.push(e.status) }),
    );

    ['a', 'b'].forEach((name) =>
      backend
        .expectOne(`${API_BASE_URL}/${name}`)
        .flush({}, { status: 401, statusText: 'Unauthorized' }),
    );
    backend
      .expectOne(`${API_BASE_URL}/auth/refresh-token`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(errors).toEqual([401, 401]);
    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('sbp.session')).toBeNull();
    // One redirect for all the failed calls.
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the refresh fails because the server is unreachable', () => {
    let status = -1;
    http.get(`${API_BASE_URL}/a`).subscribe({ error: (e) => (status = e.status) });

    backend.expectOne(`${API_BASE_URL}/a`).flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${API_BASE_URL}/auth/refresh-token`).error(new ProgressEvent('error'));

    expect(status).toBe(0);
    expect(auth.isLoggedIn()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not sign out for other errors, including a 400 on the re-sent request', () => {
    const statuses: number[] = [];
    http.get(`${API_BASE_URL}/forbidden`).subscribe({ error: (e) => statuses.push(e.status) });
    backend
      .expectOne(`${API_BASE_URL}/forbidden`)
      .flush({}, { status: 403, statusText: 'Forbidden' });

    http.post(`${API_BASE_URL}/events`, {}).subscribe({ error: (e) => statuses.push(e.status) });
    backend.expectOne(`${API_BASE_URL}/events`).flush({}, { status: 401, statusText: 'x' });
    backend.expectOne(`${API_BASE_URL}/auth/refresh-token`).flush(REFRESHED);
    backend
      .expectOne(`${API_BASE_URL}/events`)
      .flush({}, { status: 400, statusText: 'Bad Request' });

    expect(statuses).toEqual([403, 400]);
    expect(auth.isLoggedIn()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not try to refresh when login fails', () => {
    let status = 0;
    http.post(`${API_BASE_URL}/auth/login`, {}).subscribe({ error: (e) => (status = e.status) });
    backend
      .expectOne(`${API_BASE_URL}/auth/login`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    backend.expectNone(`${API_BASE_URL}/auth/refresh-token`);
    expect(auth.isLoggedIn()).toBe(true);
  });

  it('logout revokes the refresh token and clears the session', () => {
    auth.logout();

    const logout = backend.expectOne(`${API_BASE_URL}/auth/logout`);
    expect(logout.request.body).toEqual({ refreshToken: 'old-refresh' });
    expect(logout.request.headers.has('Authorization')).toBe(false);
    logout.flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('sbp.session')).toBeNull();
  });
});
