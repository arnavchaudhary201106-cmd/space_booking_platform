import { Venue } from './venue.model';

export interface EventItem {
  id: number;
  name: string;
  startDateTime: string; // yyyy-MM-ddTHH:mm:ss, local time, no timezone
  endDateTime: string; // yyyy-MM-ddTHH:mm:ss, local time, no timezone
  description: string | null;
  venues: Venue[];
}

export interface EventPayload {
  name: string;
  startDateTime: string;
  endDateTime: string;
  description: string;
  venueIds: number[];
}
