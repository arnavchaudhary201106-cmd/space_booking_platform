import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api';
import { BorderRef, Stall, StallPayload } from '../models/stall.model';

@Injectable({ providedIn: 'root' })
export class StallService {
  constructor(private http: HttpClient) {}

  private url(eventId: number, venueId: number) {
    return `${API_BASE_URL}/events/${eventId}/venues/${venueId}/stalls`;
  }

  getStalls(eventId: number, venueId: number): Observable<Stall[]> {
    return this.http.get<Stall[]>(this.url(eventId, venueId));
  }

  // Books a stall: creates it together with the cells it covers.
  bookStall(eventId: number, venueId: number, payload: StallPayload): Observable<Stall> {
    return this.http.post<Stall>(this.url(eventId, venueId), payload);
  }

  // Deletes a booked stall, which frees its cells.
  deleteStall(eventId: number, venueId: number, stallId: number): Observable<void> {
    return this.http.delete<void>(`${this.url(eventId, venueId)}/${stallId}`);
  }

  // Marks the given borders of a booked stall as open or closed.
  updateBorders(
    eventId: number,
    venueId: number,
    stallId: number,
    open: boolean,
    borders: BorderRef[],
  ): Observable<Stall> {
    return this.http.patch<Stall>(`${this.url(eventId, venueId)}/${stallId}/borders`, {
      open,
      borders,
    });
  }
}
