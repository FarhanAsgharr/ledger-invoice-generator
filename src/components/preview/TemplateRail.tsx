import { Check } from 'lucide-react';
import { ACCENT_PRESETS, TEMPLATES } from '@/constants/templates';
import { prefetchTemplate } from '@/components/preview/InvoiceSheet';
import { cn } from '@/lib/utils';
import type { TemplateId } from '@/types';

interface TemplateRailProps {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
  accent: string;
  onAccentChange: (hex: string) => void;
}

/**
 * Template switcher. Each chip carries a two-tone swatch drawn from the
 * template's own default accent, so the rail reads as a set of papers rather
 * than a list of words.
 */
export function TemplateRail({ value, onChange, accent, onAccentChange }: TemplateRailProps) {
  return (
    <div className="no-print space-y-3">
      <div
        role="radiogroup"
        aria-label="Invoice template"
        className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {TEMPLATES.map((template) => {
          const active = template.id === value;
          return (
            <button
              key={template.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={template.blurb}
              onMouseEnter={() => prefetchTemplate(template.id)}
              onFocus={() => prefetchTemplate(template.id)}
              onClick={() => {
                onChange(template.id);
                onAccentChange(template.defaultAccent);
              }}
              className={cn(
                'group relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2',
                'ring-1 ring-inset transition-all duration-200 ease-swift',
                active
                  ? 'bg-surface text-fg shadow-card ring-brand-500'
                  : 'bg-surface/60 text-muted ring-hairline hover:bg-surface hover:text-fg hover:ring-faint/50',
              )}
            >
              <span
                aria-hidden="true"
                className="h-6 w-5 shrink-0 overflow-hidden rounded-[4px] ring-1 ring-inset ring-black/10"
                style={{
                  background: `linear-gradient(160deg, ${template.swatch[0]} 0 38%, #ffffff 38% 100%)`,
                }}
              >
                <span
                  className="mt-[10px] block h-[1.5px] w-3 translate-x-[4px]"
                  style={{ backgroundColor: template.swatch[1], opacity: 0.5 }}
                />
                <span
                  className="mt-[3px] block h-[1.5px] w-2 translate-x-[4px]"
                  style={{ backgroundColor: template.swatch[1], opacity: 0.35 }}
                />
              </span>
              <span className="whitespace-nowrap text-[0.8125rem] font-semibold">{template.name}</span>
              {active && <Check aria-hidden="true" className="h-3.5 w-3.5 text-brand-500" />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xs font-semibold uppercase tracking-wider text-faint">Accent</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {ACCENT_PRESETS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onAccentChange(hex)}
              aria-label={`Use accent colour ${hex}`}
              aria-pressed={accent.toLowerCase() === hex.toLowerCase()}
              className={cn(
                'h-5 w-5 rounded-full ring-1 ring-inset ring-black/15 transition-transform duration-200',
                'hover:scale-110',
                accent.toLowerCase() === hex.toLowerCase() &&
                  'ring-2 ring-offset-2 ring-offset-canvas ring-fg',
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
          <label className="relative ml-1 inline-flex cursor-pointer items-center">
            <span className="sr-only">Choose a custom accent colour</span>
            <input
              type="color"
              value={accent}
              onChange={(event) => onAccentChange(event.target.value)}
              className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-hairline"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
