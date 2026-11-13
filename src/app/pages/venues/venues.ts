import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { VenueCard } from '../../components/utility/venue-card/venue-card';
import { VENUES } from '../../constants/venues';

@Component({
  selector: 'app-venues',
  imports: [VenueCard],
  templateUrl: './venues.html',
  styleUrl: './venues.scss',
})
export class Venues implements OnInit {
  readonly availableVenues = VENUES;

  constructor(private title: Title) {}

  ngOnInit() {
    this.title.setTitle('Venues');
  }
}
