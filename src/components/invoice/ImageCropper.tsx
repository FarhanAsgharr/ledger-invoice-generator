import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { describeLogoSrc } from '@/lib/logo';
import { clamp, cn } from '@/lib/utils';

type Shape = 'square' | 'wide';

const SHAPES: Record<Shape, { ratio: number; label: string; hint: string }> = {
  square: { ratio: 1, label: 'Square', hint: 'Best for a mark or monogram' },
  wide: { ratio: 3, label: 'Wide', hint: 'Best for a wordmark' },
};

/** Longest edge of the exported image. Keeps the data URL well under 400 KB. */
const OUTPUT_LONG_EDGE = 640;
const VIEWPORT_WIDTH = 320;
const CHECKER_SIZE = 10;

/** Above this mean luminance a logo is treated as light-on-dark artwork. */
const LIGHT_LOGO_THRESHOLD = 0.62;

export interface CroppedLogo {
  /** PNG data URL, alpha preserved. */
  dataUrl: string;
  /**
   * True when the artwork is predominantly light. Templates with a coloured
   * header use this to decide whether the logo needs a white plate behind it.
   */
  isLight: boolean;
}

interface ImageCropperProps {
  open: boolean;
  /** Base64 data URL of the image being cropped. Never a blob: URL. */
  source: string | null;
  onCancel: () => void;
  onApply: (result: CroppedLogo) => void;
}

interface PaintOptions {
  width: number;
  height: number;
  pixelRatio: number;
  /**
   * `checker` draws a transparency grid behind the artwork — on-screen only.
   * `flatten` bakes an opaque white plate in, which the user must opt into.
   * `none` keeps the canvas transparent, which is what export uses by default.
   */
  backdrop: 'checker' | 'flatten' | 'none';
}

/**
 * Crop, zoom and rotate the uploaded logo, then hand back a PNG data URL.
 *
 * Two things about this component are load-bearing:
 *
 *  1. **Alpha is preserved.** An earlier version filled the output canvas with
 *     opaque white before drawing, which was invisible for dark logos and
 *     turned every white-on-transparent logo — the most common export from any
 *     design tool — into a solid white rectangle. The preview still shows a
 *     backdrop so transparency is legible; the exported canvas never does
 *     unless the user asks for it.
 *
 *  2. **Rasterising here is the security boundary.** An uploaded SVG never
 *     reaches the store or the preview as markup, only as pixels.
 */
export function ImageCropper({ open, source, onCancel, onApply }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragState = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const [shape, setShape] = useState<Shape>('square');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [flatten, setFlatten] = useState(false);
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
      // Some SVGs report no intrinsic size; give them a box to rasterise into.
      if (!image.naturalWidth || !image.naturalHeight) {
        image.width = 512;
        image.height = 512;
      }
      console.info('[Ledger] cropper source decoded', {
        src: describeLogoSrc(source),
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
      imageRef.current = image;
      setReady(true);
    };
    image.onerror = () => {
      if (cancelled) return;
      console.error('[Ledger] cropper could not decode the source image', {
        src: describeLogoSrc(source),
        reason: 'The browser rejected the image data. The file may be corrupt, or its extension may not match its contents.',
      });
      imageRef.current = null;
      setReady(false);
      setError('That file could not be read as an image. Try a PNG, JPG, WebP or SVG.');
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

  /** Returns false when there is nothing to draw, so callers can react. */
  const paint = useCallback(
    (canvas: HTMLCanvasElement, { width, height, pixelRatio, backdrop }: PaintOptions): boolean => {
      const image = imageRef.current;
      if (!image) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);

      // Start from a genuinely empty surface. Anything opaque is deliberate.
      ctx.clearRect(0, 0, width, height);

      if (backdrop === 'checker') {
        for (let y = 0; y < height; y += CHECKER_SIZE) {
          for (let x = 0; x < width; x += CHECKER_SIZE) {
            const even = ((x / CHECKER_SIZE) | 0) % 2 === ((y / CHECKER_SIZE) | 0) % 2;
            ctx.fillStyle = even ? '#ffffff' : '#eef1f5';
            ctx.fillRect(x, y, CHECKER_SIZE, CHECKER_SIZE);
          }
        }
      } else if (backdrop === 'flatten') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }

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
      return true;
    },
    [baseScale, offset.x, offset.y, rotation, viewport.width, zoom],
  );

  /* Repaint the live preview whenever anything changes. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    paint(canvas, {
      width: viewport.width,
      height: viewport.height,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      backdrop: flatten ? 'flatten' : 'checker',
    });
  }, [paint, ready, viewport, flatten]);

  /* Pan with pointer or touch. */
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragState.current;
    if (!drag) return;
    setOffset({ x: drag.ox + (event.clientX - drag.x), y: drag.oy + (event.clientY - drag.y) });
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
    setError(null);
    try {
      const output = document.createElement('canvas');
      const width = OUTPUT_LONG_EDGE;
      const height = Math.round(width / SHAPES[shape].ratio);

      const painted = paint(output, {
        width,
        height,
        pixelRatio: 1,
        backdrop: flatten ? 'flatten' : 'none',
      });

      if (!painted) {
        setError('The image is still loading. Give it a moment and try again.');
        return;
      }

      const { blank, isLight } = inspectCanvas(output);
      if (blank) {
        setError('The crop frame is empty. Zoom out or drag the image into the frame.');
        return;
      }

      const dataUrl = output.toDataURL('image/png');
      if (!dataUrl.startsWith('data:image/png;base64,')) {
        setError('The browser could not encode the logo. Try a different file.');
        return;
      }

      console.info('[Ledger] cropper output', {
        dataUrl: describeLogoSrc(dataUrl),
        width: output.width,
        height: output.height,
        isLight,
        flattened: flatten,
      });
      onApply({ dataUrl, isLight });
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
      description="Drag to move, scroll or use the slider to zoom. Whatever sits inside the frame is what appears on the invoice."
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
            onWheel={(event) => setZoom((current) => clamp(current - event.deltaY * 0.002, 0.4, 4))}
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

        <div className="w-full rounded-xl bg-sunken px-4 py-3 ring-1 ring-inset ring-hairline">
          <Switch
            checked={flatten}
            onChange={setFlatten}
            label="Add a white background"
            description="Transparency is kept by default. Turn this on if your logo needs a solid plate behind it."
          />
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

/**
 * Read back the rendered pixels to answer two questions the user should never
 * have to: did anything land inside the frame, and is the artwork light or dark?
 *
 * Wrapped in try/catch because a tainted canvas throws here — in that case we
 * fall back to "not blank, not light" rather than blocking a valid upload.
 */
function inspectCanvas(canvas: HTMLCanvasElement): { blank: boolean; isLight: boolean } {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { blank: false, isLight: false };

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let opaque = 0;
    let luminance = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 24) continue;
      opaque += 1;
      luminance += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    }

    if (opaque === 0) return { blank: true, isLight: false };
    return { blank: false, isLight: luminance / opaque > LIGHT_LOGO_THRESHOLD };
  } catch {
    return { blank: false, isLight: false };
  }
}
