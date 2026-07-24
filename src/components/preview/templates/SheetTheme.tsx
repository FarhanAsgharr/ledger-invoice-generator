import { createContext, useContext, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { buildSheetPalette } from './palette';
import type { SheetMode, SheetPalette } from './palette';

/**
 * Carries the sheet palette to the templates.
 *
 * Context rather than props because the palette is needed by every primitive in
 * `shared.tsx` as well as by the templates themselves, and threading it through
 * would touch every call site for no gain.
 */
const SheetThemeContext = createContext<SheetPalette | null>(null);

export function SheetThemeProvider({
  mode,
  accent,
  children,
}: {
  mode: SheetMode;
  accent: string;
  children: ReactNode;
}) {
  const palette = useMemo(() => buildSheetPalette(mode, accent), [mode, accent]);
  return <SheetThemeContext.Provider value={palette}>{children}</SheetThemeContext.Provider>;
}

/**
 * The active palette. Falls back to light paper so a template rendered outside
 * a provider — in a test, or a future standalone export — still looks right.
 */
export function useSheetPalette(): SheetPalette {
  const palette = useContext(SheetThemeContext);
  return useMemo(() => palette ?? buildSheetPalette('light', '#12A17A'), [palette]);
}

/** Root style every sheet starts from: exact A4 at 96 dpi, in the active palette. */
export function sheetRoot(palette: SheetPalette): CSSProperties {
  return {
    width: '794px',
    minHeight: '1123px',
    backgroundColor: palette.PAPER,
    color: palette.INK,
    fontSize: '13px',
    lineHeight: 1.55,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  };
}
