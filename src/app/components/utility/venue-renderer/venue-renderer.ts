import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { fabric } from 'fabric';
import { LayoutRendererService } from '../../../services/layout-renderer.service';
import { COLORS, GROUP_BORDER_COLORS, METERS_TO_PIXELS } from '../../../constants/venue-layout';
import { VenueLayout } from '../../../models/venue.model';
import { StallRect } from '../../../models/stall-rect.model';
import { BorderLine } from '../../../models/border-line.model';
import { BorderDirection } from '../../../models/border-direction.model';
import { MarkedStall } from '../../../models/marked-stall.model';

const BORDER_DIRECTIONS: BorderDirection[] = ['top', 'bottom', 'left', 'right'];
const BORDER_INSET = 2;
const BORDER_TOOLTIP_GAP = 4;
const STALL_TOOLTIP_GAP = 15;

@Component({
  selector: 'app-venue-renderer',
  imports: [NgStyle],
  templateUrl: './venue-renderer.html',
  styleUrl: './venue-renderer.scss',
})
export class VenueRenderer implements AfterViewInit, OnDestroy {
  canvas!: fabric.Canvas;

  @Input({ required: true }) venueLayout!: VenueLayout;

  @ViewChild('venueCanvas') private venueCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('venueCanvasContainer') private venueCanvasContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('borderTooltip') private borderTooltipRef!: ElementRef<HTMLDivElement>;
  @ViewChild('stallTooltip') private stallTooltipRef!: ElementRef<HTMLDivElement>;

  isBorderTooltipVisible = signal(false);
  isHoveredBorderOpen = signal(false);
  borderTooltipPosition = signal({ x: 0, y: 0 });
  isStallTooltipVisible = signal(false);
  stallTooltipPosition = signal({ x: 0, y: 0 });

  private rows = 0;
  private cols = 0;
  private cellWidth = 0;
  private cellHeight = 0;
  private nonClickableRects: { left: number; top: number; width: number; height: number }[] = [];
  private markedStalls = new Map<string, MarkedStall>();
  private groupColors = new Map<number, string>();
  private nextGroupId = 0;
  private hoveredBorderLines: BorderLine[] = [];
  private hoveredGroupId?: number;

  private isDragging = false;
  private dragOrigin = { x: 0, y: 0 };
  private selectionRect?: fabric.Rect;

  constructor(private layoutRendererService: LayoutRendererService) {}

  ngAfterViewInit() {
    this.renderVenueLayout();
    this.addStallMarkingListeners();
  }

  ngOnDestroy() {
    this.canvas?.dispose();
  }

  private renderVenueLayout() {
    const { length, breadth, helperTexts, exitLabels } = this.venueLayout;
    const { cellWidth, cellHeight, nonClickableAreas } = this.venueLayout.layoutData;

    const venueWidth = length * METERS_TO_PIXELS;
    const venueHeight = breadth * METERS_TO_PIXELS;

    this.cols = Math.floor(venueWidth / (cellWidth * METERS_TO_PIXELS));
    this.rows = Math.floor(venueHeight / (cellHeight * METERS_TO_PIXELS));

    this.cellWidth = venueWidth / this.cols;
    this.cellHeight = venueHeight / this.rows;

    this.nonClickableRects = (nonClickableAreas ?? []).map((area) => ({
      left: area.x * METERS_TO_PIXELS,
      top: area.y * METERS_TO_PIXELS,
      width: area.width * METERS_TO_PIXELS,
      height: area.height * METERS_TO_PIXELS,
    }));

    this.canvas = this.initFabricCanvas();
    this.canvas.setWidth(venueWidth + 1);
    this.canvas.setHeight(venueHeight + 1);

    const rect = new fabric.Rect({
      left: 0,
      top: 0,
      width: this.cellWidth * this.cols,
      height: this.cellHeight * this.rows,
      fill: COLORS.layout,
      selectable: false,
      hasControls: false,
      hoverCursor: 'pointer',
    });

    this.canvas.add(rect);

    this.layoutRendererService.renderGridLines({
      canvas: this.canvas,
      rows: this.rows,
      cols: this.cols,
      cellWidth: this.cellWidth,
      cellHeight: this.cellHeight,
      venueWidth,
      venueHeight,
    });

    this.layoutRendererService.renderNonClickableAreas({
      canvas: this.canvas,
      nonClickableAreas,
    });

    this.layoutRendererService.renderHelperTexts(
      this.venueCanvasContainerRef.nativeElement,
      helperTexts,
    );

    this.layoutRendererService.renderExitLabels(
      this.venueCanvasContainerRef.nativeElement,
      exitLabels,
    );
  }

  private initFabricCanvas() {
    const canvasElement = this.venueCanvasRef.nativeElement;
    return new fabric.Canvas(canvasElement, {
      selection: false,
      targetFindTolerance: 6,
    });
  }

  private addStallMarkingListeners() {
    this.canvas.on('mouse:down', (event) => this.onCanvasMouseDown(event));
    this.canvas.on('mouse:move', (event) => this.onCanvasMouseMove(event));
    this.canvas.on('mouse:up', () => this.onCanvasMouseUp());
  }

  private onCanvasMouseDown(event: fabric.IEvent<MouseEvent>) {
    const target = event.target;

    if (target instanceof fabric.Line) {
      return;
    }

    if (target instanceof StallRect) {
      this.unmarkStall(target.cellKey);
      return;
    }

    const pointer = this.canvas.getPointer(event.e);
    this.isDragging = true;
    this.dragOrigin = pointer;

    this.selectionRect = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      fill: 'rgba(0, 0, 0, 0.1)',
      stroke: 'black',
      strokeWidth: 1,
      selectable: false,
      evented: false,
    });

    this.canvas.add(this.selectionRect);
  }

  private onCanvasMouseMove(event: fabric.IEvent<MouseEvent>) {
    if (!this.isDragging || !this.selectionRect) {
      return;
    }

    const pointer = this.canvas.getPointer(event.e);

    this.selectionRect.set({
      left: Math.min(pointer.x, this.dragOrigin.x),
      top: Math.min(pointer.y, this.dragOrigin.y),
      width: Math.abs(pointer.x - this.dragOrigin.x),
      height: Math.abs(pointer.y - this.dragOrigin.y),
    });

    this.canvas.requestRenderAll();
  }

  private onCanvasMouseUp() {
    if (!this.isDragging || !this.selectionRect) {
      return;
    }

    this.isDragging = false;

    const { left = 0, top = 0, width = 0, height = 0 } = this.selectionRect;
    this.canvas.remove(this.selectionRect);
    this.selectionRect = undefined;

    const minCol = Math.max(0, Math.floor(left / this.cellWidth));
    const maxCol = Math.min(this.cols - 1, Math.ceil((left + width) / this.cellWidth) - 1);
    const minRow = Math.max(0, Math.floor(top / this.cellHeight));
    const maxRow = Math.min(this.rows - 1, Math.ceil((top + height) / this.cellHeight) - 1);

    if (minCol > maxCol || minRow > maxRow) {
      this.canvas.requestRenderAll();
      return;
    }

    const newCellKeys: string[] = [];

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const key = `${row},${col}`;

        if (this.markedStalls.has(key) || this.overlapsNonClickableArea(row, col)) {
          continue;
        }

        newCellKeys.push(key);
      }
    }

    if (!newCellKeys.length) {
      this.canvas.requestRenderAll();
      return;
    }

    this.markStalls(newCellKeys);
  }

  private overlapsNonClickableArea(row: number, col: number): boolean {
    const left = col * this.cellWidth;
    const top = row * this.cellHeight;
    const right = left + this.cellWidth;
    const bottom = top + this.cellHeight;

    return this.nonClickableRects.some(
      (area) =>
        left < area.left + area.width &&
        right > area.left &&
        top < area.top + area.height &&
        bottom > area.top,
    );
  }

  private getNeighborKey(row: number, col: number, direction: BorderDirection): string {
    switch (direction) {
      case 'top':
        return `${row - 1},${col}`;
      case 'bottom':
        return `${row + 1},${col}`;
      case 'left':
        return `${row},${col - 1}`;
      case 'right':
        return `${row},${col + 1}`;
    }
  }

  private getEdgeCoords(
    row: number,
    col: number,
    direction: BorderDirection,
  ): [number, number, number, number] {
    const left = col * this.cellWidth;
    const top = row * this.cellHeight;

    switch (direction) {
      case 'top':
        return [left, top, left + this.cellWidth, top];
      case 'bottom': {
        const y = top + this.cellHeight - BORDER_INSET;
        return [left, y, left + this.cellWidth, y];
      }
      case 'left':
        return [left, top, left, top + this.cellHeight];
      case 'right': {
        const x = left + this.cellWidth - BORDER_INSET;
        return [x, top, x, top + this.cellHeight];
      }
    }
  }

  private markStalls(cellKeys: string[]) {
    const groupId = this.nextGroupId++;
    this.groupColors.set(groupId, GROUP_BORDER_COLORS[groupId % GROUP_BORDER_COLORS.length]);

    cellKeys.forEach((key) => {
      const [row, col] = key.split(',').map(Number);

      const rect = this.layoutRendererService.createStallRect({
        canvas: this.canvas,
        cellKey: key,
        groupId,
        left: col * this.cellWidth,
        top: row * this.cellHeight,
        width: this.cellWidth,
        height: this.cellHeight,
        onMouseOver: (event) => this.onStallMouseOver(event),
        onMouseOut: (event) => this.onStallMouseOut(event),
      });

      this.markedStalls.set(key, { rect, groupId, borders: {} });
    });

    const affectedKeys = new Set<string>();

    cellKeys.forEach((key) => {
      affectedKeys.add(key);

      const [row, col] = key.split(',').map(Number);
      BORDER_DIRECTIONS.forEach((direction) => {
        const neighborKey = this.getNeighborKey(row, col, direction);
        if (this.markedStalls.has(neighborKey)) {
          affectedKeys.add(neighborKey);
        }
      });
    });

    affectedKeys.forEach((key) => this.refreshCellBorders(key));
    this.canvas.requestRenderAll();
  }

  private refreshCellBorders(cellKey: string) {
    const stall = this.markedStalls.get(cellKey);
    if (!stall) {
      return;
    }

    BORDER_DIRECTIONS.forEach((direction) => {
      const existingBorder = stall.borders[direction];
      if (existingBorder) {
        this.layoutRendererService.removeCanvasObject(this.canvas, existingBorder);
      }
    });
    stall.borders = {};

    const [row, col] = cellKey.split(',').map(Number);
    const color = this.groupColors.get(stall.groupId)!;

    BORDER_DIRECTIONS.forEach((direction) => {
      const neighborKey = this.getNeighborKey(row, col, direction);
      const neighborStall = this.markedStalls.get(neighborKey);

      if (neighborStall && neighborStall.groupId === stall.groupId) {
        return;
      }

      stall.borders[direction] = this.layoutRendererService.createBorderLine({
        canvas: this.canvas,
        coords: this.getEdgeCoords(row, col, direction),
        color,
        groupId: stall.groupId,
        onMouseOver: (event) => this.onBorderMouseOver(event),
        onMouseOut: (event) => this.onBorderMouseOut(event),
      });
    });
  }

  private unmarkStall(cellKey: string) {
    const stall = this.markedStalls.get(cellKey);
    if (!stall) {
      return;
    }

    this.layoutRendererService.removeCanvasObject(this.canvas, stall.rect);
    BORDER_DIRECTIONS.forEach((direction) => {
      const border = stall.borders[direction];
      if (border) {
        this.layoutRendererService.removeCanvasObject(this.canvas, border);
      }
    });

    this.markedStalls.delete(cellKey);

    const [row, col] = cellKey.split(',').map(Number);
    BORDER_DIRECTIONS.forEach((direction) => {
      const neighborKey = this.getNeighborKey(row, col, direction);
      if (this.markedStalls.has(neighborKey)) {
        this.refreshCellBorders(neighborKey);
      }
    });

    this.isBorderTooltipVisible.set(false);
    this.canvas.requestRenderAll();
  }

  private removeGroup(groupId: number) {
    const cellKeys = Array.from(this.markedStalls.entries())
      .filter(([, stall]) => stall.groupId === groupId)
      .map(([cellKey]) => cellKey);

    cellKeys.forEach((cellKey) => {
      const stall = this.markedStalls.get(cellKey)!;
      this.layoutRendererService.removeCanvasObject(this.canvas, stall.rect);
      BORDER_DIRECTIONS.forEach((direction) => {
        const border = stall.borders[direction];
        if (border) {
          this.layoutRendererService.removeCanvasObject(this.canvas, border);
        }
      });
      this.markedStalls.delete(cellKey);
    });

    const neighborKeys = new Set<string>();
    cellKeys.forEach((cellKey) => {
      const [row, col] = cellKey.split(',').map(Number);
      BORDER_DIRECTIONS.forEach((direction) => {
        const neighborKey = this.getNeighborKey(row, col, direction);
        if (this.markedStalls.has(neighborKey)) {
          neighborKeys.add(neighborKey);
        }
      });
    });
    neighborKeys.forEach((key) => this.refreshCellBorders(key));

    this.groupColors.delete(groupId);
    this.isStallTooltipVisible.set(false);
    this.canvas.requestRenderAll();
  }

  private getAllBorderLines(): BorderLine[] {
    return Array.from(this.markedStalls.values()).flatMap((stall) =>
      BORDER_DIRECTIONS.map((direction) => stall.borders[direction]).filter(
        (border): border is BorderLine => !!border,
      ),
    );
  }

  private onBorderMouseOver(event: fabric.IEvent<MouseEvent>) {
    const line = event.target as BorderLine;
    const isVertical = line.x1 === line.x2;

    this.hoveredBorderLines = this.getAllBorderLines().filter(
      (border) =>
        border.groupId === line.groupId &&
        (isVertical
          ? border.x1 === line.x1 && border.x2 === line.x2
          : border.y1 === line.y1 && border.y2 === line.y2),
    );

    this.isHoveredBorderOpen.set(!!line.strokeDashArray?.length);

    const xs = this.hoveredBorderLines.flatMap((border) => [border.x1!, border.x2!]);
    const ys = this.hoveredBorderLines.flatMap((border) => [border.y1!, border.y2!]);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

    const tooltip = this.borderTooltipRef.nativeElement;

    this.borderTooltipPosition.set({
      x: centerX - tooltip.offsetWidth / 2,
      y: centerY - tooltip.offsetHeight - BORDER_TOOLTIP_GAP,
    });
    this.isBorderTooltipVisible.set(true);
  }

  private onBorderMouseOut(event: fabric.IEvent<MouseEvent>) {
    const relatedTarget = event.e.relatedTarget as HTMLElement | null;

    if (relatedTarget && this.borderTooltipRef.nativeElement.contains(relatedTarget)) {
      return;
    }

    this.isBorderTooltipVisible.set(false);
  }

  hideBorderTooltip() {
    this.isBorderTooltipVisible.set(false);
  }

  setHoveredBorderState(isOpen: boolean) {
    if (!this.hoveredBorderLines.length) {
      return;
    }

    this.hoveredBorderLines.forEach((line) =>
      this.layoutRendererService.setBorderState(this.canvas, line, isOpen),
    );
    this.isHoveredBorderOpen.set(isOpen);
  }

  private onStallMouseOver(event: fabric.IEvent<MouseEvent>) {
    const rect = event.target as StallRect;
    this.hoveredGroupId = rect.groupId;

    const groupStalls = Array.from(this.markedStalls.values()).filter(
      (stall) => stall.groupId === rect.groupId,
    );

    const lefts = groupStalls.map((stall) => stall.rect.left!);
    const tops = groupStalls.map((stall) => stall.rect.top!);
    const rights = groupStalls.map((stall) => stall.rect.left! + stall.rect.width!);
    const bottoms = groupStalls.map((stall) => stall.rect.top! + stall.rect.height!);

    const centerX = (Math.min(...lefts) + Math.max(...rights)) / 2;
    const centerY = (Math.min(...tops) + Math.max(...bottoms)) / 2;

    const tooltip = this.stallTooltipRef.nativeElement;
    this.stallTooltipPosition.set({
      x: centerX - tooltip.offsetWidth / 2,
      y: centerY - tooltip.offsetHeight - STALL_TOOLTIP_GAP,
    });
    this.isStallTooltipVisible.set(true);
  }

  private onStallMouseOut(event: fabric.IEvent<MouseEvent>) {
    const relatedTarget = event.e.relatedTarget as HTMLElement | null;

    if (relatedTarget && this.stallTooltipRef.nativeElement.contains(relatedTarget)) {
      return;
    }

    this.isStallTooltipVisible.set(false);
  }

  hideStallTooltip() {
    this.isStallTooltipVisible.set(false);
  }

  bookStall() {
    alert('This feature is under development.');
  }

  removeMarkedArea() {
    if (this.hoveredGroupId === undefined) {
      return;
    }

    if (!confirm('Are you sure you want to remove this marked area?')) {
      return;
    }

    this.removeGroup(this.hoveredGroupId);
  }

  removeAllMarkedAreas() {
    this.markedStalls.forEach((stall) => {
      this.layoutRendererService.removeCanvasObject(this.canvas, stall.rect);
      BORDER_DIRECTIONS.forEach((direction) => {
        const border = stall.borders[direction];
        if (border) {
          this.layoutRendererService.removeCanvasObject(this.canvas, border);
        }
      });
    });

    this.markedStalls.clear();
    this.groupColors.clear();
    this.isStallTooltipVisible.set(false);
    this.isBorderTooltipVisible.set(false);
    this.canvas.requestRenderAll();
  }
}
