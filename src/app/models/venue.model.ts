export interface Venue {
  id: number;
  name: string;
  description: string;
}

export interface VenueLayout {
  venueId: number;
  name: string;
  length: number;
  breadth: number;
  layoutData: {
    cellWidth: number;
    cellHeight: number;
    nonClickableAreas: NonClickableArea[] | null;
  };
  helperTexts: HelperText[] | null;
  legends: Legend[] | null;
  exitLabels: ExitLabel[] | null;
}

export interface NonClickableArea {
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
}

export interface Legend {
  label: string;
  colorCode: string;
}

export interface HelperText {
  image: {
    url: string;
    width?: number;
    height?: number;
    label: string;
  }[];
  positionX: number;
  positionY: number;
}

export interface ExitLabel {
  text: string;
  positionX: number;
  positionY: number;
}
