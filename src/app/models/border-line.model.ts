import { fabric } from 'fabric';
import { BorderDirection } from './border-direction.model';

export class BorderLine extends fabric.Line {
  groupId!: number;
  cellKey!: string; // "row,col" of the cell this edge belongs to
  direction!: BorderDirection;
}
