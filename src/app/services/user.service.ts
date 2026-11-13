import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../constants/api';
import { CreateUserPayload, User } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly url = `${API_BASE_URL}/users`;

  constructor(private http: HttpClient) {}

  create(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(this.url, payload);
  }

  isUsernameAvailable(username: string): Observable<boolean> {
    const params = new HttpParams().set('username', username);
    return this.http
      .get<{ available: boolean }>(`${this.url}/username-available`, { params })
      .pipe(map((response) => response.available));
  }
}
