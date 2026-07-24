import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Tooltip } from '@/components/ui/Tooltip';

/** Light/dark switch. The icon crossfades and rotates rather than swapping. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Tooltip label={isDark ? 'Switch to light' : 'Switch to dark'} side="bottom">
      <button
        type="button"
        onClick={toggleTheme}
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl text-muted ring-1 ring-inset ring-hairline transition-colors duration-200 hover:bg-sunken hover:text-fg"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={theme}
            initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 70, scale: 0.6 }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            className="absolute grid place-items-center"
          >
            {isDark ? (
              <Moon aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Sun aria-hidden="true" className="h-4 w-4" />
            )}
          </motion.span>
        </AnimatePresence>
      </button>
    </Tooltip>
  );
}
