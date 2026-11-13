import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EventItem } from '../../../models/event.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-event-card',
  imports: [RouterModule, DatePipe],
  templateUrl: './event-card.html',
  styleUrl: './event-card.scss',
})
export class EventCard {
  readonly auth = inject(AuthService);
  @Input({ required: true }) event!: EventItem;
  @Output() edit = new EventEmitter<EventItem>();
  @Output() remove = new EventEmitter<EventItem>();
}
