import { Venue } from '../models/venue.model';

// Hardcoded list of venues. Ids match the layout files in public/layouts and the backend catalog.
export const VENUES: Venue[] = [
  {
    id: 1,
    name: 'Grand Exhibition Hall',
    description:
      'A large 84 m × 116 m hall with 14 exits, restrooms and drinking water on every side. Suited to big trade fairs and multi-zone exhibitions.',
  },
  {
    id: 2,
    name: 'Central Pavilion',
    description:
      'A mid-size 66 m × 90 m pavilion with cargo and service entries and 10 exits. A good fit for expos, showcases and product launches.',
  },
  {
    id: 3,
    name: 'Convention Arena',
    description:
      'Our largest hall at 86 m × 146 m, with a main entry, 14 exits and cargo access. Built for major conventions and high-footfall events.',
  },
  {
    id: 4,
    name: 'Promenade Gallery',
    description:
      'A long 156 m × 43 m gallery with emergency exits along its length. Ideal for linear displays, art shows and pop-up markets.',
  },
];
