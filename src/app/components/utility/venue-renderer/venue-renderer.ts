import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { fabric } from 'fabric';
import { LayoutRendererService } from '../../../services/layout-renderer.service';
import { COLORS, METERS_TO_PIXELS } from '../../../constants/venue-layout';
import { VenueLayout } from '../../../models/venue.model';

@Component({
  selector: 'app-venue-renderer',
  imports: [],
  templateUrl: './venue-renderer.html',
  styleUrl: './venue-renderer.scss',
})
export class VenueRenderer implements AfterViewInit {
  canvas!: fabric.Canvas;

  @Input({ required: true }) venueLayout!: VenueLayout;

  @ViewChild('venueCanvas') private venueCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('venueCanvasContainer') private venueCanvasContainerRef!: ElementRef<HTMLDivElement>;

  constructor(private layoutRendererService: LayoutRendererService) {}

  ngAfterViewInit() {
    this.renderVenueLayout();
  }

  private renderVenueLayout() {
    const { length, breadth, helperTexts, exitLabels } = this.venueLayout;
    const { cellWidth, cellHeight, nonClickableAreas } = this.venueLayout.layoutData;

    const venueWidth = length * METERS_TO_PIXELS;
    const venueHeight = breadth * METERS_TO_PIXELS;

    const cols = Math.floor(venueWidth / (cellWidth * METERS_TO_PIXELS));
    const rows = Math.floor(venueHeight / (cellHeight * METERS_TO_PIXELS));

    const adjustedCellWidth = venueWidth / cols;
    const adjustedCellHeight = venueHeight / rows;

    this.canvas = this.initFabricCanvas();
    this.canvas.setWidth(venueWidth + 1);
    this.canvas.setHeight(venueHeight + 1);

    const rect = new fabric.Rect({
      left: 0,
      top: 0,
      width: adjustedCellWidth * cols,
      height: adjustedCellHeight * rows,
      fill: COLORS.layout,
      selectable: false,
      hasControls: false,
      hoverCursor: 'pointer',
    });

    this.canvas.add(rect);

    this.layoutRendererService.renderGridLines({
      canvas: this.canvas,
      rows,
      cols,
      cellWidth: adjustedCellWidth,
      cellHeight: adjustedCellHeight,
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
    });
  }
}
