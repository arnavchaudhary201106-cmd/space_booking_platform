import { Component, Inject, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Stall, StallCell } from '../../../models/stall.model';
import { StallService } from '../../../services/stall.service';

export interface BookingDialogData {
  eventId: number;
  venueId: number;
  eventName: string;
  venueName: string;
  cells: StallCell[];
  area: number; // square metres
}

@Component({
  selector: 'app-booking-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './booking-dialog.html',
  styleUrl: './booking-dialog.scss',
})
export class BookingDialog {
  private fb = inject(FormBuilder);

  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  // Only the stall name is required.
  readonly form = this.fb.nonNullable.group({
    stallName: ['', [Validators.required, Validators.maxLength(255)]],
    name: ['', Validators.maxLength(255)],
    contact: ['', Validators.maxLength(255)],
    description: ['', Validators.maxLength(1000)],
  });

  constructor(
    private stallService: StallService,
    private dialogRef: MatDialogRef<BookingDialog, Stall>,
    @Inject(MAT_DIALOG_DATA) public data: BookingDialogData,
  ) {}

  submit() {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();

    this.isSaving.set(true);
    this.errorMessage.set('');

    this.stallService
      .bookStall(this.data.eventId, this.data.venueId, {
        stallName: value.stallName.trim(),
        name: value.name.trim(),
        contact: value.contact.trim(),
        description: value.description.trim(),
        cells: this.data.cells,
      })
      .subscribe({
        next: (stall) => this.dialogRef.close(stall),
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            err?.error?.detail || 'Could not book the stall. Please try again.',
          );
        },
      });
  }
}
