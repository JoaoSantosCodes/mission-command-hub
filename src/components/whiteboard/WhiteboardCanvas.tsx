import React, { useEffect, useRef, useState } from 'react';
import { useDrawing, type DrawingElement } from './DrawingContext';

function newId() {
  return `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gridSize = 20;
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawFreehand(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  color: string,
  width: number,
  opacity: number
) {
  if (points.length < 2) return;
  ctx.globalAlpha = opacity / 100;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0]![0], points[0]![1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]![0], points[i]![1]);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
  const headlen = 15;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function drawElement(ctx: CanvasRenderingContext2D, element: DrawingElement, isSelected: boolean) {
  ctx.globalAlpha = element.opacity / 100;
  ctx.strokeStyle = element.strokeColor;
  ctx.lineWidth = element.strokeWidth;
  ctx.fillStyle = element.backgroundColor;

  if (element.strokeStyle === 'dashed') ctx.setLineDash([5, 5]);
  else if (element.strokeStyle === 'dotted') ctx.setLineDash([2, 3]);
  else ctx.setLineDash([]);

  ctx.save();
  ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
  ctx.rotate((element.angle * Math.PI) / 180);
  ctx.translate(-(element.x + element.width / 2), -(element.y + element.height / 2));

  switch (element.type) {
    case 'rectangle':
      ctx.fillRect(element.x, element.y, element.width, element.height);
      ctx.strokeRect(element.x, element.y, element.width, element.height);
      break;
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(
        element.x + element.width / 2,
        element.y + element.height / 2,
        element.width / 2,
        element.height / 2,
        0,
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.stroke();
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(element.x + element.width / 2, element.y);
      ctx.lineTo(element.x + element.width, element.y + element.height / 2);
      ctx.lineTo(element.x + element.width / 2, element.y + element.height);
      ctx.lineTo(element.x, element.y + element.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'line':
    case 'arrow':
      ctx.beginPath();
      ctx.moveTo(element.x, element.y);
      ctx.lineTo(element.x + element.width, element.y + element.height);
      ctx.stroke();
      if (element.type === 'arrow') {
        drawArrowHead(
          ctx,
          element.x,
          element.y,
          element.x + element.width,
          element.y + element.height
        );
      }
      break;
    case 'draw':
      if (element.points && element.points.length > 0) {
        const abs = element.points.map(
          (p) => [p[0] + element.x, p[1] + element.y] as [number, number]
        );
        drawFreehand(ctx, abs, element.strokeColor, element.strokeWidth, element.opacity);
      }
      break;
    case 'text':
      ctx.fillStyle = element.strokeColor;
      ctx.font = `${element.fontSize ?? 16}px sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(element.text ?? '', element.x, element.y);
      break;
  }

  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);

  if (isSelected) {
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(element.x - 3, element.y - 3, element.width + 6, element.height + 6);
    ctx.setLineDash([]);
  }
}

function drawPreview(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  tool: string,
  style: { strokeColor: string; backgroundColor: string; strokeWidth: number }
) {
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);

  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = style.strokeWidth;
  ctx.fillStyle = style.backgroundColor;

  switch (tool) {
    case 'rectangle':
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
      break;
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height / 2);
      ctx.lineTo(x + width / 2, y + height);
      ctx.lineTo(x, y + height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'line':
    case 'arrow':
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      if (tool === 'arrow') drawArrowHead(ctx, start.x, start.y, end.x, end.y);
      break;
  }
  ctx.globalAlpha = 1;
}

type Props = {
  canvasRef: React.RefObject<HTMLCanvasElement>;
};

export function WhiteboardCanvas({ canvasRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [drawPoints, setDrawPoints] = useState<Array<[number, number]>>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const {
    activeTool,
    elements,
    addElement,
    updateElement,
    deleteElement,
    selectedIds,
    setSelectedIds,
    strokeColor,
    backgroundColor,
    strokeWidth,
    strokeStyle,
    roughness,
    opacity,
  } = useDrawing();

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    drawGrid(ctx, canvas.offsetWidth, canvas.offsetHeight);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    elements.forEach((el) => drawElement(ctx, el, selectedIds.includes(el.id)));

    if (
      isDrawing &&
      startPos &&
      currentPos &&
      activeTool !== 'selection' &&
      activeTool !== 'hand'
    ) {
      if (activeTool === 'draw' && drawPoints.length > 0) {
        drawFreehand(ctx, drawPoints, strokeColor, strokeWidth, opacity);
      } else {
        drawPreview(ctx, startPos, currentPos, activeTool, {
          strokeColor,
          backgroundColor,
          strokeWidth,
        });
      }
    }

    ctx.restore();
  }, [
    canvasRef,
    elements,
    isDrawing,
    startPos,
    currentPos,
    activeTool,
    selectedIds,
    drawPoints,
    zoom,
    pan,
    strokeColor,
    backgroundColor,
    strokeWidth,
    strokeStyle,
    roughness,
    opacity,
  ]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    setStartPos(pos);
    setCurrentPos(pos);

    if (activeTool === 'selection') {
      const clicked = elements.find(
        (el) =>
          pos.x >= el.x && pos.x <= el.x + el.width && pos.y >= el.y && pos.y <= el.y + el.height
      );
      if (clicked) {
        if (e.ctrlKey || e.metaKey) {
          setSelectedIds(
            selectedIds.includes(clicked.id)
              ? selectedIds.filter((id) => id !== clicked.id)
              : [...selectedIds, clicked.id]
          );
        } else {
          setSelectedIds([clicked.id]);
        }
        setDraggedElement(clicked.id);
        setDragOffset({ x: pos.x - clicked.x, y: pos.y - clicked.y });
      } else {
        setSelectedIds([]);
      }
    } else if (activeTool === 'draw') {
      setIsDrawing(true);
      setDrawPoints([[pos.x, pos.y]]);
    } else if (activeTool === 'hand') {
      setIsDrawing(true);
    } else {
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    setCurrentPos(pos);

    if (activeTool === 'hand' && isDrawing && startPos) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const deltaX = e.clientX - (startPos.x * zoom + rect.left);
      const deltaY = e.clientY - (startPos.y * zoom + rect.top);
      setPan((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    } else if (draggedElement && selectedIds.includes(draggedElement)) {
      updateElement(draggedElement, { x: pos.x - dragOffset.x, y: pos.y - dragOffset.y });
    } else if (activeTool === 'draw' && isDrawing) {
      setDrawPoints((prev) => [...prev, [pos.x, pos.y]]);
    }
  };

  const handleMouseUp = () => {
    if (draggedElement) {
      setDraggedElement(null);
      return;
    }

    if (activeTool === 'draw' && isDrawing && drawPoints.length > 5) {
      const xs = drawPoints.map((p) => p[0]);
      const ys = drawPoints.map((p) => p[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      addElement({
        id: newId(),
        type: 'draw',
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        angle: 0,
        strokeColor,
        backgroundColor: 'transparent',
        strokeWidth,
        strokeStyle,
        roughness,
        opacity,
        points: drawPoints.map((p) => [p[0] - minX, p[1] - minY]),
      });
    } else if (
      isDrawing &&
      startPos &&
      currentPos &&
      activeTool !== 'draw' &&
      activeTool !== 'hand'
    ) {
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);

      if (
        width > 5 &&
        height > 5 &&
        ['rectangle', 'diamond', 'ellipse', 'arrow', 'line'].includes(activeTool)
      ) {
        addElement({
          id: newId(),
          type: activeTool as DrawingElement['type'],
          x,
          y,
          width,
          height,
          angle: 0,
          strokeColor,
          backgroundColor,
          strokeWidth,
          strokeStyle,
          roughness,
          opacity,
        });
      }
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
    setDrawPoints([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      selectedIds.forEach((id) => deleteElement(id));
      setSelectedIds([]);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.1, Math.min(5, prev * (e.deltaY > 0 ? 0.9 : 1.1))));
  };

  const cursor =
    activeTool === 'hand'
      ? 'grab'
      : activeTool === 'selection'
        ? 'default'
        : activeTool === 'eraser'
          ? 'cell'
          : 'crosshair';

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ cursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDrawing(false);
          setDraggedElement(null);
        }}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        tabIndex={0}
        aria-label="Área de desenho"
      />
    </div>
  );
}
