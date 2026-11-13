import { Component, OnInit, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { VenueCard } from '../../components/utility/venue-card/venue-card';
import { VENUES } from '../../constants/venues';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterModule, VenueCard],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  readonly auth = inject(AuthService);
  private readonly title = inject(Title);

  readonly venues = VENUES;

  readonly features = [
    {
      title: 'Events with dates and times',
      text: 'Create events with a start and end time, choose the venues they use, and edit or cancel them as plans change.',
    },
    {
      title: 'No double bookings',
      text: 'A venue can only be in one event at a time. Overlapping dates and times are rejected before they are saved.',
    },
    {
      title: 'Book stalls on the floor plan',
      text: 'Drag across the venue grid to mark an area, then book it as a stall with the booker’s details.',
    },
    {
      title: 'Open and closed borders',
      text: 'Mark each side of a stall as open or closed to show where visitors can walk through. Changes are saved straight away.',
    },
    {
      title: 'Real venue layouts',
      text: 'Every venue shows its exits, entries, restrooms, drinking water and service areas, to scale.',
    },
    {
      title: 'Roles for your team',
      text: 'Admins run events and bookings. Viewers can look at everything but change nothing.',
    },
  ];

  readonly steps = [
    { title: 'Sign in', text: 'Use the account your admin created for you.' },
    {
      title: 'Pick an event',
      text: 'Open an existing event, or create one and choose its venues.',
    },
    {
      title: 'Open a venue',
      text: 'See the floor plan with every stall already booked for that event.',
    },
    { title: 'Book a stall', text: 'Mark the area, add the booker’s details and confirm.' },
  ];

  readonly roles = [
    {
      name: 'Super Admin',
      can: ['Everything an admin can do', 'Create other super admins'],
    },
    {
      name: 'Admin',
      can: [
        'Create, edit and delete events',
        'Book and delete stalls, change their borders',
        'Create admin and viewer accounts',
      ],
    },
    {
      name: 'Viewer',
      can: ['See events and venue layouts', 'Hover booked stalls to see their details'],
    },
  ];

  ngOnInit() {
    this.title.setTitle('Home');
  }
}
