import { StallRect } from './stall-rect.model';
import { BorderLine } from './border-line.model';
import { BorderDirection } from './border-direction.model';

export interface MarkedStall {
  rect: StallRect;
  groupId: number;
  borders: Partial<Record<BorderDirection, BorderLine>>;
}
