import { useCallback, useRef, useState } from 'react';
import { Crop, ImageUp, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ImageCropper } from '@/components/invoice/ImageCropper';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_BYTES = 8 * 1024 * 1024;

interface LogoUploaderProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

/** Drop zone, cropper trigger and live preview for the company logo. */
export function LogoUploader({ value, onChange }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const toast = useToast();

  const readFile = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) {
        toast.error('That file type is not supported', 'Use a PNG, JPG, WebP, GIF or SVG.');
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error('That image is too large', 'Pick a file under 8 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSource(typeof reader.result === 'string' ? reader.result : null);
        setCropping(true);
      };
      reader.onerror = () => toast.error('The file could not be read', 'Try uploading it again.');
      reader.readAsDataURL(file);
    },
    [toast],
  );

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="text-[0.8125rem] font-semibold leading-none text-muted">Logo</span>

        {value ? (
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-sunken p-4 ring-1 ring-inset ring-hairline">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-2 ring-1 ring-inset ring-hairline">
              <img
                src={value}
                alt="Your company logo as it will appear on the invoice"
                className="h-full w-full object-contain"
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
                  onClick={() => {
                    setSource(value);
                    setCropping(true);
                  }}
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
                  onClick={() => {
                    onChange(null);
                    setSource(null);
                    toast.info('Logo removed');
                  }}
                  className="text-danger-400 hover:bg-danger-400/10 hover:text-danger-400"
                >
                  Remove
                </Button>
              </div>
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
                ? 'border-brand-500 bg-brand-500/8 scale-[1.01]'
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
        onCancel={() => setCropping(false)}
        onApply={(dataUrl) => {
          onChange(dataUrl);
          setCropping(false);
          toast.success('Logo updated', 'It is on the invoice now.');
        }}
      />
    </>
  );
}
