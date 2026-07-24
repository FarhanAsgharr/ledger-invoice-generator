import { useCallback, useEffect, useRef, useState } from 'react';
import { Crop, ImageOff, ImageUp, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ImageCropper } from '@/components/invoice/ImageCropper';
import type { CroppedLogo } from '@/components/invoice/ImageCropper';
import { useToast } from '@/context/ToastContext';
import { describeLogoSrc, logLogoFailed, logLogoLoaded } from '@/lib/logo';
import { cn } from '@/lib/utils';

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_BYTES = 8 * 1024 * 1024;

interface LogoUploaderProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  /** Reports whether the artwork is light, so templates can plate it correctly. */
  onMetaChange?: (meta: { isLight: boolean }) => void;
}

/**
 * Drop zone, cropper trigger and live preview for the company logo.
 *
 * **Every image is a base64 data URL, start to finish.** `URL.createObjectURL`
 * is deliberately not used anywhere in this flow. A blob: URL is bound to the
 * document that created it: it dies on reload, dies when revoked, and gives no
 * useful error when it does — it simply renders nothing. A data URL is
 * self-contained, survives `localStorage`, and embeds directly into the PDF and
 * PNG exports. The cost is memory during cropping (an 8 MB file becomes an
 * ~11 MB string), which is the right trade for a logo that always renders.
 */
export function LogoUploader({ value, onChange, onMetaChange }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [broken, setBroken] = useState(false);
  const toast = useToast();

  const openCropper = useCallback((dataUrl: string) => {
    setSource(dataUrl);
    setCropping(true);
  }, []);

  const closeCropper = useCallback(() => {
    setCropping(false);
    setSource(null);
  }, []);

  // A newly assigned logo is trusted until an <img> says otherwise.
  useEffect(() => {
    setBroken(false);
  }, [value]);

  const readFile = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        console.error('[Ledger] logo rejected · unsupported type', {
          name: file.name,
          type: file.type || '(none reported by the OS)',
        });
        toast.error('That file type is not supported', 'Use a PNG, JPG, WebP, GIF or SVG.');
        return;
      }
      if (file.size > MAX_BYTES) {
        console.error('[Ledger] logo rejected · too large', { name: file.name, bytes: file.size });
        toast.error('That image is too large', 'Pick a file under 8 MB.');
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result !== 'string' || !reader.result.startsWith('data:')) {
          console.error('[Ledger] logo read produced no data URL', {
            name: file.name,
            resultType: typeof reader.result,
          });
          toast.error('The file could not be read', 'Try uploading it again.');
          return;
        }
        console.info('[Ledger] logo file read', {
          name: file.name,
          type: file.type,
          bytes: file.size,
          dataUrl: describeLogoSrc(reader.result),
        });
        openCropper(reader.result);
      };

      reader.onerror = () => {
        console.error('[Ledger] logo read failed', { name: file.name, error: reader.error?.message });
        toast.error('The file could not be read', 'Try uploading it again.');
      };

      // Always base64. See the note on this component for why not object URLs.
      reader.readAsDataURL(file);
    },
    [openCropper, toast],
  );

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const removeLogo = () => {
    console.info('[Ledger] logo removed');
    onChange(null);
    onMetaChange?.({ isLight: false });
    setSource(null);
    setBroken(false);
    toast.info('Logo removed');
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="text-[0.8125rem] font-semibold leading-none text-muted">Logo</span>

        {value && !broken ? (
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-sunken p-4 ring-1 ring-inset ring-hairline">
            {/* A checkerboard, so a transparent logo reads as transparent rather
                than as a white rectangle the user cannot explain. */}
            <div
              className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl p-2 ring-1 ring-inset ring-hairline"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #e9edf2 25%, transparent 25%), linear-gradient(-45deg, #e9edf2 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e9edf2 75%), linear-gradient(-45deg, transparent 75%, #e9edf2 75%)',
                backgroundSize: '12px 12px',
                backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                backgroundColor: '#ffffff',
              }}
            >
              <img
                src={value}
                alt="Your company logo as it will appear on the invoice"
                className="h-full w-full object-contain"
                onLoad={(event) => logLogoLoaded('editor thumbnail', event.currentTarget)}
                onError={() => {
                  logLogoFailed('editor thumbnail', value);
                  setBroken(true);
                }}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-sm font-medium text-fg">Logo added</p>
              <p className="text-xs text-faint">
                It appears in the header of every template. Stored on this device only.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Crop className="h-3.5 w-3.5" />}
                  onClick={() => openCropper(value)}
                >
                  Reposition
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<ImageUp className="h-3.5 w-3.5" />}
                  onClick={() => inputRef.current?.click()}
                >
                  Replace
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={removeLogo}
                  className="text-danger-400 hover:bg-danger-400/10 hover:text-danger-400"
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : value && broken ? (
          /* The stored value did not decode. Say so, and offer the two ways out. */
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-danger-400/8 p-4 ring-1 ring-inset ring-danger-400/30">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-danger-400/12 text-danger-400">
              <ImageOff aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">This logo could not be displayed</p>
              <p className="mt-0.5 text-xs text-muted">
                The saved image is unreadable. Upload it again, or remove it to fall back to your
                business name.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
                Upload again
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={removeLogo}
                className="text-danger-400 hover:bg-danger-400/10 hover:text-danger-400"
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'group flex flex-col items-center justify-center gap-2 rounded-2xl px-5 py-8',
              'border-2 border-dashed transition-all duration-250 ease-swift',
              dragging
                ? 'scale-[1.01] border-brand-500 bg-brand-500/8'
                : 'border-hairline bg-sunken hover:border-brand-400/60 hover:bg-brand-500/5',
            )}
          >
            <span
              className={cn(
                'grid h-11 w-11 place-items-center rounded-xl transition-transform duration-250',
                'bg-brand-500/10 text-brand-600 group-hover:-translate-y-0.5 dark:text-brand-300',
              )}
            >
              <UploadCloud aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-fg">Drop a logo, or browse</span>
            <span className="text-xs text-faint">PNG, JPG, WebP, GIF or SVG · up to 8 MB</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="sr-only"
          aria-label="Upload a company logo"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) readFile(file);
            // Reset so picking the same file twice still fires a change.
            event.target.value = '';
          }}
        />
      </div>

      <ImageCropper
        open={cropping}
        source={source}
        onCancel={closeCropper}
        onApply={(result: CroppedLogo) => {
          console.info('[Ledger] logo cropped', {
            dataUrl: describeLogoSrc(result.dataUrl),
            isLight: result.isLight,
          });
          onChange(result.dataUrl);
          onMetaChange?.({ isLight: result.isLight });
          closeCropper();
          toast.success('Logo updated', 'It is on the invoice now.');
        }}
      />
    </>
  );
}
