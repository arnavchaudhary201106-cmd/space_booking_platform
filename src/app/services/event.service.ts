import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api';
import { EventItem, EventPayload } from '../models/event.model';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly url = `${API_BASE_URL}/events`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>(this.url);
  }

  getById(id: number): Observable<EventItem> {
    return this.http.get<EventItem>(`${this.url}/${id}`);
  }

  create(payload: EventPayload): Observable<EventItem> {
    return this.http.post<EventItem>(this.url, payload);
  }

  update(id: number, payload: EventPayload): Observable<EventItem> {
    return this.http.put<EventItem>(`${this.url}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
