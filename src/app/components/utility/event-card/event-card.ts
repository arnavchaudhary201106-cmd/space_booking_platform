import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EventItem } from '../../../models/event.model';

@Component({
  selector: 'app-event-card',
  imports: [RouterModule, DatePipe],
  templateUrl: './event-card.html',
  styleUrl: './event-card.scss',
})
export class EventCard {
  @Input({ required: true }) event!: EventItem;
  @Output() edit = new EventEmitter<EventItem>();
  @Output() remove = new EventEmitter<EventItem>();
}
