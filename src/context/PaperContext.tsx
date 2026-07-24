import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { loadExportFollowsTheme, saveExportFollowsTheme } from '@/lib/storage';
import type { SheetMode } from '@/components/preview/templates/palette';

interface PaperContextValue {
  /** Mode the sheet is rendering in right now. */
  mode: SheetMode;
  /** True while an export is forcing a mode — transitions are suppressed. */
  instant: boolean;
  /** When false (the default) exports always use white paper. */
  exportFollowsTheme: boolean;
  setExportFollowsTheme: (value: boolean) => void;
  /**
   * Switch the sheet to the mode an export should use, wait for it to paint,
   * and hand back a function that restores the on-screen mode.
   */
  beginExportTheme: () => Promise<() => void>;
}

const PaperContext = createContext<PaperContextValue | null>(null);

/** Longest we will wait for a frame before giving up on it. */
const FRAME_TIMEOUT_MS = 250;

/**
 * Resolve after two animation frames, so React has committed and painted.
 *
 * Each wait is raced against a timer: `requestAnimationFrame` never fires in a
 * background or throttled tab, and an unbounded wait here would hang the export
 * that is waiting on it — with no error to show for it.
 */
function twoFrames(): Promise<void> {
  const frame = () =>
    Promise.race([
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
      new Promise<void>((resolve) => {
        setTimeout(resolve, FRAME_TIMEOUT_MS);
      }),
    ]);
  return frame().then(frame);
}

/**
 * Owns the invoice sheet's light/dark state.
 *
 * The sheet follows the app theme on screen, but a PDF is a document someone
 * else will open and probably print — so export defaults to white paper
 * regardless of what the app looks like. "Export using current theme" opts out.
 *
 * Forcing a mode for export goes through `beginExportTheme` rather than a CSS
 * override: the templates carry their colours as inline styles, so the only way
 * to change them is to re-render. `instant` suppresses the colour transition
 * while that happens, because html2canvas reads *computed* styles — capturing
 * mid-transition would rasterise half-interpolated colours.
 */
export function PaperProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [exportFollowsTheme, setStored] = useState<boolean>(() => loadExportFollowsTheme());
  const [forced, setForced] = useState<SheetMode | null>(null);

  const mode: SheetMode = forced ?? theme;

  const setExportFollowsTheme = useCallback((value: boolean) => {
    setStored(value);
    saveExportFollowsTheme(value);
  }, []);

  const beginExportTheme = useCallback(async () => {
    const target: SheetMode = exportFollowsTheme ? theme : 'light';
    if (target === theme) return () => undefined;

    setForced(target);
    await twoFrames();
    return () => setForced(null);
  }, [exportFollowsTheme, theme]);

  const value = useMemo<PaperContextValue>(
    () => ({
      mode,
      instant: forced !== null,
      exportFollowsTheme,
      setExportFollowsTheme,
      beginExportTheme,
    }),
    [mode, forced, exportFollowsTheme, setExportFollowsTheme, beginExportTheme],
  );

  return <PaperContext.Provider value={value}>{children}</PaperContext.Provider>;
}

export function usePaper(): PaperContextValue {
  const context = useContext(PaperContext);
  if (!context) throw new Error('usePaper must be used inside <PaperProvider>');
  return context;
}
