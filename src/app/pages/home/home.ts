import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { VenueCard } from '../../components/utility/venue-card/venue-card';
import { Venue } from '../../models/venue.model';

@Component({
  selector: 'app-home',
  imports: [VenueCard],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  // Dummy list of available venues.
  readonly availableVenues: Venue[] = [
    {
      id: 1,
      name: 'Available Venue 1',
      description:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Perspiciatis ut possimus voluptatibus, iusto, dolorem accusamus, animi minus distinctio eveniet consequatur doloremque exercitationem rerum iure delectus officiis sequi soluta culpa beatae!',
    },
    {
      id: 2,
      name: 'Available Venue 2',
      description:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Perspiciatis ut possimus voluptatibus, iusto, dolorem accusamus, animi minus distinctio eveniet consequatur doloremque exercitationem rerum iure delectus officiis sequi soluta culpa beatae!',
    },
    {
      id: 3,
      name: 'Available Venue 3',
      description:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Perspiciatis ut possimus voluptatibus, iusto, dolorem accusamus, animi minus distinctio eveniet consequatur doloremque exercitationem rerum iure delectus officiis sequi soluta culpa beatae!',
    },
    {
      id: 4,
      name: 'Available Venue 4',
      description:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Perspiciatis ut possimus voluptatibus, iusto, dolorem accusamus, animi minus distinctio eveniet consequatur doloremque exercitationem rerum iure delectus officiis sequi soluta culpa beatae!',
    },
  ];

  constructor(private title: Title) {}

  ngOnInit() {
    this.title.setTitle('Home');
  }
}
