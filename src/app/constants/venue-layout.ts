export const MIN_ZOOM = 0.5;

export const MAX_ZOOM = 2.5;

export const METERS_TO_PIXELS = 20;

export const DASHED_BORDER_CONFIG = [10, 8];

export const COLORS = {
  layout: 'white',
  gridLine: 'black',
  markedSpace: 'gray',
  markedSpaceBorder: 'black',
  stallFill: '#D8D8D8',
  // Translucent so the grid lines underneath stay visible.
  bookedStallFill: 'rgba(135, 206, 250, 0.3)',
  // Borders of booked stalls: dark blue when closed, red when open.
  bookedBorderClosed: '#00008B',
  bookedBorderOpen: '#FF0000',
};

// Border colors of marked (not yet booked) stalls; each marked group gets the next one.
export const GROUP_BORDER_COLORS = [
  '#5210E5',
  '#0D6EFD',
  '#198754',
  '#DC3545',
  '#FD7E14',
  '#20C997',
  '#6F42C1',
  '#D63384',
];
