import type { TemplateId } from '@/types';

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  /** One line, in the interface's voice: what this template is for. */
  blurb: string;
  /** Accent that ships with the template; users can override it. */
  defaultAccent: string;
  /** Drives the swatch preview in the template rail. */
  swatch: [string, string];
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'modern',
    name: 'Modern',
    blurb: 'Colour-blocked header, generous spacing. Reads well on screen.',
    defaultAccent: '#12A17A',
    swatch: ['#12A17A', '#0C6353'],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    blurb: 'Type and rules only. Nothing competes with the numbers.',
    defaultAccent: '#19202B',
    swatch: ['#19202B', '#7C8AA0'],
  },
  {
    id: 'corporate',
    name: 'Corporate',
    blurb: 'Banded table and a boxed summary. Built for procurement teams.',
    defaultAccent: '#1D4ED8',
    swatch: ['#1D4ED8', '#1E3A8A'],
  },
  {
    id: 'elegant',
    name: 'Elegant',
    blurb: 'Serif display, hairline rules, wide margins. For studios.',
    defaultAccent: '#8A6D3B',
    swatch: ['#8A6D3B', '#C9A227'],
  },
  {
    id: 'classic',
    name: 'Classic',
    blurb: 'The bordered, ruled invoice accountants have filed for decades.',
    defaultAccent: '#334155',
    swatch: ['#334155', '#94A3B8'],
  },
  {
    id: 'professional',
    name: 'Professional',
    blurb: 'Sidebar for your details, wide table for the work.',
    defaultAccent: '#0F766E',
    swatch: ['#0F766E', '#134E4A'],
  },
  {
    id: 'creative',
    name: 'Creative',
    blurb: 'Oversized number, asymmetric grid, a splash of colour.',
    defaultAccent: '#DB2777',
    swatch: ['#DB2777', '#F97316'],
  },
];

export const TEMPLATE_MAP = new Map(TEMPLATES.map((t) => [t.id, t]));

/** Accent presets offered next to the colour input. */
export const ACCENT_PRESETS = [
  '#12A17A',
  '#0F766E',
  '#1D4ED8',
  '#4F46E5',
  '#7C3AED',
  '#DB2777',
  '#E11D48',
  '#EA580C',
  '#CA8A04',
  '#19202B',
];
