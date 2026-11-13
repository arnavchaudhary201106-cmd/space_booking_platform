import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-footer',
  imports: [RouterModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  readonly auth = inject(AuthService);
  readonly year = new Date().getFullYear();
}
