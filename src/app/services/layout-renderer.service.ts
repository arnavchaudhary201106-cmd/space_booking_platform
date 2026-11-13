import { DOCUMENT, Inject, Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { fabric } from 'fabric';
import { COLORS, DASHED_BORDER_CONFIG, METERS_TO_PIXELS } from '../constants/venue-layout';
import { ExitLabel, HelperText, NonClickableArea } from '../models/venue.model';
import { StallRect } from '../models/stall-rect.model';
import { BorderLine } from '../models/border-line.model';
import { BorderDirection } from '../models/border-direction.model';

@Injectable({
  providedIn: 'root',
})
export class LayoutRendererService {
  private renderer: Renderer2;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    rendererFactory: RendererFactory2,
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  renderGridLines({
    canvas,
    rows,
    cols,
    cellWidth,
    cellHeight,
    venueWidth,
    venueHeight,
  }: {
    canvas: fabric.Canvas;
    rows: number;
    cols: number;
    cellWidth: number;
    cellHeight: number;
    venueWidth: number;
    venueHeight: number;
  }) {
    const lineOptions = {
      stroke: COLORS.gridLine,
      strokeWidth: 1,
      selectable: false,
      hasControls: false,
      hoverCursor: 'default',
      evented: false,
    };

    for (let row = 0; row <= rows; row++) {
      const x = 0;
      const y = row * cellHeight;

      const horizontalLine = new fabric.Line([x, y, venueWidth, y], lineOptions);
      canvas.add(horizontalLine);
    }

    for (let col = 0; col <= cols; col++) {
      const x = col * cellWidth;
      const y = 0;

      const verticalLine = new fabric.Line([x, y, x, venueHeight], lineOptions);
      canvas.add(verticalLine);
    }
  }

  renderNonClickableAreas({
    canvas,
    nonClickableAreas,
  }: {
    canvas: fabric.Canvas;
    nonClickableAreas: NonClickableArea[] | null;
  }) {
    nonClickableAreas
      ?.map((area) => ({
        ...area,
        x: area.x * METERS_TO_PIXELS,
        y: area.y * METERS_TO_PIXELS,
        width: area.width * METERS_TO_PIXELS,
        height: area.height * METERS_TO_PIXELS,
      }))
      .forEach(({ x, y, width, height, fillColor, strokeColor }) => {
        const rect = new fabric.Rect({
          left: x,
          top: y,
          width,
          height,
          fill: fillColor || COLORS.markedSpace,
          stroke: strokeColor || COLORS.markedSpaceBorder,
          selectable: false,
          hoverCursor: 'default',
        });

        canvas!.add(rect);
      });
  }

  createStallRect({
    canvas,
    cellKey,
    groupId,
    left,
    top,
    width,
    height,
    onMouseOver,
    onMouseOut,
  }: {
    canvas: fabric.Canvas;
    cellKey: string;
    groupId: number;
    left: number;
    top: number;
    width: number;
    height: number;
    onMouseOver: (event: fabric.IEvent<MouseEvent>) => void;
    onMouseOut: (event: fabric.IEvent<MouseEvent>) => void;
  }): StallRect {
    const rect = new StallRect({
      left,
      top,
      width,
      height,
      fill: COLORS.stallFill,
      stroke: COLORS.gridLine,
      strokeWidth: 1,
      selectable: false,
      hasControls: false,
      hoverCursor: 'pointer',
    });
    rect.cellKey = cellKey;
    rect.groupId = groupId;

    rect.on('mouseover', onMouseOver);
    rect.on('mouseout', onMouseOut);
    canvas.add(rect);

    return rect;
  }

  createBorderLine({
    canvas,
    coords,
    color,
    groupId,
    cellKey,
    direction,
    onMouseOver,
    onMouseOut,
  }: {
    canvas: fabric.Canvas;
    coords: [number, number, number, number];
    color: string;
    groupId: number;
    cellKey: string;
    direction: BorderDirection;
    onMouseOver: (event: fabric.IEvent<MouseEvent>) => void;
    onMouseOut: (event: fabric.IEvent<MouseEvent>) => void;
  }): BorderLine {
    const border = new BorderLine(coords, {
      strokeWidth: 2,
      stroke: color,
      strokeDashArray: [],
      selectable: false,
      hasControls: false,
      hoverCursor: 'pointer',
    });
    border.groupId = groupId;
    border.cellKey = cellKey;
    border.direction = direction;

    border.on('mouseover', onMouseOver);
    border.on('mouseout', onMouseOut);
    canvas.add(border);

    return border;
  }

  removeCanvasObject(canvas: fabric.Canvas, object: fabric.Object) {
    canvas.remove(object);
  }

  // Open borders are dashed. `color` is applied as the stroke when given.
  setBorderState(canvas: fabric.Canvas, border: fabric.Line, isOpen: boolean, color?: string) {
    border.set({
      ...(color ? { stroke: color } : {}),
      strokeDashArray: isOpen ? DASHED_BORDER_CONFIG : [],
    });
    canvas.requestRenderAll();
  }

  renderHelperTexts(container: HTMLElement, texts: HelperText[] | null) {
    this.document.querySelectorAll('.helper-text').forEach((element) => {
      element.remove();
    });

    texts?.forEach(({ image, positionX, positionY }) => {
      const helperTextContainer = this.document.createElement('div');
      helperTextContainer.classList.add(
        'helper-text',
        'position-absolute',
        'd-flex',
        'gap-3',
        'alert',
        'alert-white',
        'border',
        'p-2',
      );
      helperTextContainer.style.left = `${positionX}px`;
      helperTextContainer.style.top = `${positionY}px`;

      image.forEach(({ url, width, height, label }) => {
        const imgContainerElm = this.document.createElement('div');
        imgContainerElm.classList.add('d-flex', 'flex-column', 'align-items-center');

        const helperImage = this.document.createElement('img');
        helperImage.src = url;
        helperImage.width = width || 40;
        helperImage.height = height || 40;

        const helperText = this.document.createElement('p');
        helperText.innerText = label;
        helperText.classList.add(
          'white-space-nowrap',
          'fs-6',
          'fw-bold',
          'text-uppercase',
          'mt-2',
          'mb-0',
        );

        this.renderer.appendChild(imgContainerElm, helperImage);
        this.renderer.appendChild(imgContainerElm, helperText);
        this.renderer.appendChild(helperTextContainer, imgContainerElm);
      });

      this.renderer.appendChild(container, helperTextContainer);
    });
  }

  renderExitLabels(container: HTMLElement, labels: ExitLabel[] | null) {
    this.document.querySelectorAll('.exit-label').forEach((element) => {
      element.remove();
    });

    labels?.forEach(({ text, positionX, positionY }) => {
      const spanTextElm = this.document.createElement('span');
      spanTextElm.classList.add(
        'exit-label',
        'position-absolute',
        'white-space-nowrap',
        'fs-6',
        'fw-bold',
      );
      spanTextElm.innerText = text;
      spanTextElm.style.left = `${positionX}px`;
      spanTextElm.style.top = `${positionY}px`;

      this.renderer.appendChild(container, spanTextElm);
    });
  }
}
