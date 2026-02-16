import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoaderService {
  readonly isVisible$ = new BehaviorSubject(false);
  private pendingApis = 0;

  show() {
    this.pendingApis++;

    this.isVisible$.next(true);
  }

  hide() {
    if (this.pendingApis) this.pendingApis--;

    this.isVisible$.next(!!this.pendingApis);
  }
}
