import { BorderDirection } from './border-direction.model';

// A grid cell of a stall. openBorders lists the sides of the cell marked open.
export interface StallCell {
  row: number;
  col: number;
  openBorders: BorderDirection[];
}

// A booked stall.
export interface Stall {
  id: number;
  stallName: string;
  name: string | null;
  contact: string | null;
  description: string | null;
  createdAt: string;
  cells: StallCell[];
}

export interface StallPayload {
  stallName: string;
  name: string;
  contact: string;
  description: string;
  cells: StallCell[];
}

// One cell edge of a stall.
export interface BorderRef {
  row: number;
  col: number;
  direction: BorderDirection;
}
