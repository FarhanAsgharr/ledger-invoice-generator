import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { clamp, cn } from '@/lib/utils';

type Shape = 'square' | 'wide';

const SHAPES: Record<Shape, { ratio: number; label: string; hint: string }> = {
  square: { ratio: 1, label: 'Square', hint: 'Best for a mark or monogram' },
  wide: { ratio: 3, label: 'Wide', hint: 'Best for a wordmark' },
};

/** Longest edge of the exported image. Keeps the data URL well under 400 KB. */
const OUTPUT_LONG_EDGE = 640;
const VIEWPORT_WIDTH = 320;

interface ImageCropperProps {
  open: boolean;
  /** Data URL of the file the user picked. */
  source: string | null;
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
}

/**
 * Crop, zoom and rotate the uploaded logo, then hand back a PNG data URL.
 *
 * Rasterising here is also the security boundary: an uploaded SVG never reaches
 * the store or the preview as markup — only as pixels.
 */
export function ImageCropper({ open, source, onCancel, onApply }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragState = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const [shape, setShape] = useState<Shape>('square');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const viewport = useMemo(
    () => ({ width: VIEWPORT_WIDTH, height: Math.round(VIEWPORT_WIDTH / SHAPES[shape].ratio) }),
    [shape],
  );

  /* Load the source into an image element we can draw from. */
  useEffect(() => {
    if (!open || !source) return undefined;
    setReady(false);
    setError(null);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });

    const image = new Image();
    image.decoding = 'async';
    let cancelled = false;

    image.onload = () => {
      if (cancelled) return;
      // Some SVGs report zero intrinsic size; give them a sane box to raster into.
      if (!image.naturalWidth || !image.naturalHeight) {
        image.width = 512;
        image.height = 512;
      }
      imageRef.current = image;
      setReady(true);
    };
    image.onerror = () => {
      if (cancelled) return;
      setError('That file could not be read as an image. Try a PNG, JPG or SVG.');
    };
    image.src = source;

    return () => {
      cancelled = true;
      imageRef.current = null;
    };
  }, [open, source]);

  /** Scale at which the image exactly covers the viewport. */
  const baseScale = useCallback(() => {
    const image = imageRef.current;
    if (!image) return 1;
    const quarterTurn = rotation % 180 !== 0;
    const width = quarterTurn ? image.naturalHeight || image.height : image.naturalWidth || image.width;
    const height = quarterTurn ? image.naturalWidth || image.width : image.naturalHeight || image.height;
    if (!width || !height) return 1;
    return Math.max(viewport.width / width, viewport.height / height);
  }, [rotation, viewport]);

  const paint = useCallback(
    (canvas: HTMLCanvasElement, width: number, height: number, pixelRatio: number) => {
      const image = imageRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx || !image) return;

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const ratio = width / viewport.width;
      const scale = baseScale() * zoom * ratio;
      const iw = image.naturalWidth || image.width;
      const ih = image.naturalHeight || image.height;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.translate(width / 2 + offset.x * ratio, height / 2 + offset.y * ratio);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.drawImage(image, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
    },
    [baseScale, offset.x, offset.y, rotation, viewport.width, zoom],
  );

  /* Repaint the live preview whenever anything changes. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    paint(canvas, viewport.width, viewport.height, pixelRatio);
  }, [paint, ready, viewport]);

  /* Pan with pointer or touch. */
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragState.current;
    if (!drag) return;
    setOffset({
      x: drag.ox + (event.clientX - drag.x),
      y: drag.oy + (event.clientY - drag.y),
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragState.current = null;
  };

  /* Arrow keys nudge, so panning is possible without a pointer. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 16 : 4;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setOffset((current) => ({ x: current.x + move[0], y: current.y + move[1] }));
  };

  const reset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const apply = () => {
    if (!ready) return;
    setSaving(true);
    try {
      const output = document.createElement('canvas');
      const width = OUTPUT_LONG_EDGE;
      const height = Math.round(width / SHAPES[shape].ratio);
      paint(output, width, height, 1);
      onApply(output.toDataURL('image/png'));
    } catch {
      setError('The image could not be processed. Try a smaller file.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Position your logo"
      description="Drag to move, scroll or use the slider to zoom. The area inside the frame is what appears on the invoice."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={reset} leftIcon={<Maximize2 className="h-4 w-4" />}>
            Reset
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={apply} loading={saving} disabled={!ready}>
            Use this logo
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-5">
        <SegmentedControl
          aria-label="Logo shape"
          value={shape}
          onChange={setShape}
          segments={(Object.keys(SHAPES) as Shape[]).map((key) => ({
            value: key,
            label: SHAPES[key].label,
          }))}
        />

        <div
          className="relative overflow-hidden rounded-2xl bg-sunken ring-1 ring-inset ring-hairline"
          style={{ width: viewport.width, height: viewport.height }}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Logo crop preview. Use the arrow keys to reposition."
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown}
            onWheel={(event) => {
              setZoom((current) => clamp(current - event.deltaY * 0.002, 0.4, 4));
            }}
            className={cn(
              'h-full w-full touch-none',
              ready ? 'cursor-grab active:cursor-grabbing' : 'cursor-wait opacity-0',
            )}
            style={{ width: viewport.width, height: viewport.height }}
          />
          {!ready && !error && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="skeleton h-full w-full" />
            </div>
          )}
          {/* Crop frame overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-brand-500/60"
          />
        </div>

        <p className="text-xs text-faint">{SHAPES[shape].hint}</p>

        <div className="flex w-full max-w-sm items-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Zoom out"
            onClick={() => setZoom((v) => clamp(v - 0.15, 0.4, 4))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <input
            type="range"
            min={0.4}
            max={4}
            step={0.01}
            value={zoom}
            aria-label="Zoom"
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-hairline accent-brand-500"
          />
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Zoom in"
            onClick={() => setZoom((v) => clamp(v + 0.15, 0.4, 4))}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Rotate 90 degrees"
            onClick={() => setRotation((r) => (r + 90) % 360)}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-danger-400">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
