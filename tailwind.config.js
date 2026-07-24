/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Tailwind's default opacity scale jumps in fives. The tints in this
      // design sit between those steps (8%, 12%, 45%), so open the scale up.
      opacity: Object.fromEntries(
        Array.from({ length: 101 }, (_, value) => [String(value), String(value / 100)]),
      ),
      colors: {
        /* ── Semantic tokens (driven by CSS variables, flip with the theme) ── */
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        sunken: 'rgb(var(--c-sunken) / <alpha-value>)',
        hairline: 'rgb(var(--c-hairline) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',

        /* ── Ledger green: the primary. Money, ledgers, "paid" stamps. ── */
        brand: {
          50: '#E9F7F1',
          100: '#C9EDE0',
          200: '#97DDC6',
          300: '#5FC8A7',
          400: '#2FB48D',
          500: '#12A17A',
          600: '#0E7C66',
          700: '#0C6353',
          800: '#0B4E43',
          900: '#093E36',
        },
        /* ── Amber: unpaid, pending, due-soon. Semantic, never decorative. ── */
        amber: {
          50: '#FDF6E3',
          100: '#FAE9BC',
          200: '#F5D57E',
          300: '#EFC248',
          400: '#E5AE1E',
          500: '#D19400',
          600: '#A87300',
          700: '#7E5600',
        },
        /* ── Rose: overdue, destructive, validation failures. ── */
        danger: {
          50: '#FDECEC',
          100: '#FAD1D2',
          200: '#F4A6A8',
          300: '#EE7B7F',
          400: '#E5484D',
          500: '#CE2F35',
          600: '#A9232A',
          700: '#7F1A20',
        },
        ink: {
          50: '#F5F7FA',
          100: '#E7EBF1',
          200: '#CFD6E0',
          300: '#AAB5C5',
          400: '#7C8AA0',
          500: '#5A6779',
          600: '#414C5C',
          700: '#2B3442',
          800: '#19202B',
          900: '#0F141C',
          950: '#080B10',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        serif: ['"Playfair Display"', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        /* Layered, low-opacity shadows — depth without the muddy grey halo. */
        card: '0 1px 2px rgb(8 11 16 / 0.04), 0 4px 12px -2px rgb(8 11 16 / 0.06)',
        lift: '0 2px 4px rgb(8 11 16 / 0.05), 0 12px 28px -6px rgb(8 11 16 / 0.12)',
        pop: '0 8px 16px -4px rgb(8 11 16 / 0.10), 0 24px 48px -12px rgb(8 11 16 / 0.20)',
        /* The signature: a sheet of paper resting on a desk. */
        sheet:
          '0 0 0 1px rgb(8 11 16 / 0.05), 0 2px 4px rgb(8 11 16 / 0.05), 0 12px 24px -8px rgb(8 11 16 / 0.14), 0 40px 64px -32px rgb(8 11 16 / 0.24)',
        'inner-hairline': 'inset 0 0 0 1px rgb(var(--c-hairline) / 1)',
        focus: '0 0 0 2px rgb(var(--c-canvas)), 0 0 0 4px rgb(18 161 122 / 0.55)',
      },
      transitionTimingFunction: {
        swift: 'cubic-bezier(0.32, 0.72, 0, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        ripple: {
          to: { transform: 'scale(4)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s cubic-bezier(0.32, 0.72, 0, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        ripple: 'ripple 0.6s linear',
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
};
