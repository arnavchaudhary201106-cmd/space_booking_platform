import { Component, Inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { provideNativeDatetimeAdapter } from '@ng-matero/extensions/core';
import { MtxDatetimepickerModule } from '@ng-matero/extensions/datetimepicker';
import { VENUES } from '../../../constants/venues';
import { EventItem, EventPayload } from '../../../models/event.model';
import { EventService } from '../../../services/event.service';

export interface EventFormDialogData {
  event?: EventItem;
}

// Local date-time without timezone, e.g. 2026-12-01T09:30:00 (matches backend LocalDateTime).
function toLocalIso(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}` +
    `T${pad(value.getHours())}:${pad(value.getMinutes())}:00`
  );
}

function fromLocalIso(value?: string): Date | null {
  return value ? new Date(value) : null;
}

// The end date-time must not be before the start date-time.
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start: Date | null = group.get('start')?.value;
  const end: Date | null = group.get('end')?.value;
  return start && end && end < start ? { dateRange: true } : null;
}

// The earliest allowed start: the current minute (an existing event keeps its own earlier start).
function earliestStart(existing: Date | null): Date {
  const now = new Date();
  now.setSeconds(0, 0);
  return existing && existing < now ? existing : now;
}

@Component({
  selector: 'app-event-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MtxDatetimepickerModule,
  ],
  providers: [provideNativeDatetimeAdapter()],
  templateUrl: './event-form-dialog.html',
  styleUrl: './event-form-dialog.scss',
})
export class EventFormDialog {
  readonly venues = VENUES;
  readonly isEdit: boolean;
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  readonly form;
  // Fixed when the dialog opens; the start date-time can't be earlier than this.
  readonly minStart: Date;

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private dialogRef: MatDialogRef<EventFormDialog, boolean>,
    @Inject(MAT_DIALOG_DATA) private data: EventFormDialogData,
  ) {
    const event = data?.event;
    this.isEdit = !!event;

    const start = fromLocalIso(event?.startDateTime);
    const end = fromLocalIso(event?.endDateTime);
    this.minStart = earliestStart(start);

    this.form = this.fb.group(
      {
        name: [event?.name ?? '', [Validators.required, Validators.maxLength(255)]],
        start: [start, Validators.required],
        end: [end, Validators.required],
        description: [event?.description ?? '', Validators.maxLength(2000)],
        venueIds: [event?.venues.map((v) => v.id) ?? ([] as number[]), Validators.required],
      },
      { validators: [dateRangeValidator, (group) => this.pastStartValidator(group)] },
    );
  }

  private pastStartValidator(group: AbstractControl): ValidationErrors | null {
    const start: Date | null = group.get('start')?.value;
    return start && start < this.minStart ? { pastStart: true } : null;
  }

  get isPastStart() {
    return this.form.hasError('pastStart');
  }

  get isDateRangeInvalid() {
    return this.form.hasError('dateRange');
  }

  isVenueSelected(id: number) {
    return (this.form.controls.venueIds.value ?? []).includes(id);
  }

  toggleVenue(id: number, checked: boolean) {
    const current = this.form.controls.venueIds.value ?? [];
    this.form.controls.venueIds.setValue(
      checked ? [...current.filter((v) => v !== id), id] : current.filter((v) => v !== id),
    );
    this.form.controls.venueIds.markAsTouched();
  }

  submit() {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    const payload: EventPayload = {
      name: (value.name ?? '').trim(),
      startDateTime: toLocalIso(value.start!),
      endDateTime: toLocalIso(value.end!),
      description: value.description ?? '',
      venueIds: value.venueIds ?? [],
    };

    this.isSaving.set(true);
    this.errorMessage.set('');

    const request = this.isEdit
      ? this.eventService.update(this.data.event!.id, payload)
      : this.eventService.create(payload);

    request.subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err?.error?.detail || 'Could not save the event. Please try again.');
      },
    });
  }
}
