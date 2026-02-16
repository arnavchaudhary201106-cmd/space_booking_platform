import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Venue } from '../../../models/venue.model';

@Component({
  selector: 'app-venue-card',
  imports: [RouterModule],
  templateUrl: './venue-card.html',
  styleUrl: './venue-card.scss',
})
export class VenueCard {
  @Input({ required: true }) venue!: Venue;
}
