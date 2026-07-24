import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, PencilLine, Sparkles, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AdjustmentsSection } from '@/components/invoice/AdjustmentsSection';
import { BusinessSection } from '@/components/invoice/BusinessSection';
import { CustomerSection } from '@/components/invoice/CustomerSection';
import { DetailsSection } from '@/components/invoice/DetailsSection';
import { ItemsSection } from '@/components/invoice/ItemsSection';
import { NotesSection } from '@/components/invoice/NotesSection';
import { HistoryDrawer } from '@/components/history/HistoryDrawer';
import { CommandPalette } from '@/components/layout/CommandPalette';
import type { PaletteActions } from '@/components/layout/CommandPalette';
import { Navbar } from '@/components/layout/Navbar';
import { PreviewColumn, TotalsSidecar } from '@/components/layout/PreviewColumn';

import { useArchive } from '@/context/ArchiveContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useIsDesktop } from '@/hooks/useMediaQuery';

import { calculateTotals } from '@/lib/calc';
import {
  createLineItem,
  createSampleInvoice,
  nextInvoiceNumber,
  normalizeInvoice,
} from '@/lib/invoice-factory';
import { exportElementToPdf, exportElementToPng, getSheetElement } from '@/lib/pdf';
import { invoiceSchema } from '@/lib/schema';
import { clearDraft, loadDraft, saveDraft, saveLastNumber, storageAvailable } from '@/lib/storage';
import { cn, debounce, downloadBlob, safeFilename } from '@/lib/utils';
import type { Customer, EditorPane, Invoice } from '@/types';

const AUTOSAVE_DELAY = 900;

/** Bootstrap value: the last draft if there is one, otherwise a worked example. */
function initialInvoice(): Invoice {
  const draft = loadDraft();
  return draft ?? createSampleInvoice();
}

export function Workspace() {
  const [bootstrap] = useState(initialInvoice);
  const archive = useArchive();
  const toast = useToast();
  const { toggleTheme } = useTheme();
  const isDesktop = useIsDesktop();

  const [pane, setPane] = useState<EditorPane>('edit');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const form = useForm<Invoice>({
    defaultValues: bootstrap,
    // The schema coerces strings to numbers, so its input and output types
    // differ; the form always holds the output shape.
    resolver: zodResolver(invoiceSchema) as unknown as Resolver<Invoice>,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const { getValues, reset, setValue, handleSubmit, watch } = form;

  /* ── Autosave ──────────────────────────────────────────────────────────
     A non-rendering subscription: RHF pushes values, we debounce them to
     localStorage. Nothing in the tree re-renders because of autosave except
     the timestamp in the navbar. */
  const persist = useMemo(
    () =>
      debounce((values: Invoice) => {
        const ok = saveDraft({ ...values, updatedAt: Date.now() });
        setSaving(false);
        if (ok) setSavedAt(Date.now());
      }, AUTOSAVE_DELAY),
    [],
  );

  useEffect(() => {
    if (!storageAvailable()) return undefined;
    const subscription = watch((values) => {
      setSaving(true);
      persist(values as Invoice);
    });
    return () => {
      subscription.unsubscribe();
      persist.cancel();
    };
  }, [watch, persist, setSaving]);

  // Flush the draft if the tab is closed mid-edit.
  useEffect(() => {
    const flush = () => saveDraft({ ...getValues(), updatedAt: Date.now() });
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [getValues]);

  /* ── Actions ───────────────────────────────────────────────────────── */

  const scrollToFirstError = useCallback(() => {
    const node = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    node.focus({ preventScroll: true });
  }, []);

  const onInvalid = useCallback(() => {
    setPane('edit');
    toast.error('This invoice is not ready yet', 'Fix the highlighted fields and try again.');
    requestAnimationFrame(scrollToFirstError);
  }, [toast, scrollToFirstError]);

  const saveInvoice = useCallback(() => {
    void handleSubmit((values) => {
      const invoice = normalizeInvoice(values);
      archive.history.save(invoice);
      saveLastNumber(invoice.number);
      saveDraft(invoice);
      setSavedAt(Date.now());
      toast.success('Invoice saved', `${invoice.number} is in your saved invoices.`);
    }, onInvalid)();
  }, [handleSubmit, archive.history, toast, onInvalid]);

  /**
   * Bring the sheet on screen before we rasterise or print it.
   *
   * Below `lg` the preview is behind a tab, so the pane has to flip and React
   * has to commit before the element has a size. On wider screens the sheet is
   * already visible and this is a no-op — `waitForRenderedLayout` in the export
   * itself handles fonts and paint on every viewport.
   */
  const ensurePreviewVisible = useCallback(async () => {
    if (isDesktop) return;
    setPane('preview');
    await new Promise((resolve) => {
      setTimeout(resolve, 400);
    });
  }, [isDesktop]);

  const downloadPdf = useCallback(() => {
    void handleSubmit(async (values) => {
      setExporting(true);
      try {
        await ensurePreviewVisible();
        await exportElementToPdf(getSheetElement(), {
          filename: `${safeFilename(values.number || 'invoice')}-${safeFilename(
            values.customer.company || values.customer.name || 'customer',
          )}`,
        });
        toast.success('PDF downloaded', 'Check your downloads folder.');
      } catch (error) {
        console.error('[Ledger] PDF export failed', error);
        toast.error(
          'The PDF could not be created',
          error instanceof Error ? error.message : 'Try again, or use Print instead.',
        );
      } finally {
        setExporting(false);
      }
    }, onInvalid)();
  }, [handleSubmit, ensurePreviewVisible, toast, onInvalid]);

  const downloadImage = useCallback(() => {
    void handleSubmit(async (values) => {
      setExporting(true);
      try {
        await ensurePreviewVisible();
        const blob = await exportElementToPng(getSheetElement());
        downloadBlob(blob, `${safeFilename(values.number || 'invoice')}.png`);
        toast.success('Image downloaded', 'A PNG of the invoice is in your downloads folder.');
      } catch (error) {
        console.error('[Ledger] Image export failed', error);
        toast.error(
          'The image could not be created',
          error instanceof Error ? error.message : 'Try downloading a PDF instead.',
        );
      } finally {
        setExporting(false);
      }
    }, onInvalid)();
  }, [handleSubmit, ensurePreviewVisible, toast, onInvalid]);

  const printInvoice = useCallback(() => {
    void handleSubmit(async () => {
      await ensurePreviewVisible();
      // Nothing to swap: the sheet already looks the way it should print.
      window.print();
      toast.info('Print dialog opened', 'Choose A4 and margins of “none” for the best result.');
    }, onInvalid)();
  }, [handleSubmit, ensurePreviewVisible, toast, onInvalid]);

  const startNewInvoice = useCallback(() => {
    const current = getValues();
    const fresh = normalizeInvoice({
      ...createSampleInvoice(),
      // Carry the business identity forward — nobody wants to retype it.
      business: current.business,
      customer: {
        name: '',
        company: '',
        billingAddress: '',
        shippingAddress: '',
        shipToBilling: true,
        phone: '',
        email: '',
        taxId: '',
      },
      items: [createLineItem()],
      number: nextInvoiceNumber(current.number),
      template: current.template,
      accent: current.accent,
      currencyCode: current.currencyCode,
      notes: current.notes,
      terms: current.terms,
    });
    reset(fresh);
    clearDraft();
    saveDraft(fresh);
    setSavedAt(null);
    setPane('edit');
    setConfirmReset(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('New invoice started', `Numbered ${fresh.number}.`);
  }, [getValues, reset, toast]);

  const openInvoice = useCallback(
    (invoice: Invoice) => {
      reset(normalizeInvoice(invoice));
      setPane('edit');
      setSavedAt(invoice.updatedAt);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.info('Invoice opened', invoice.number);
    },
    [reset, toast],
  );

  const applyCustomer = useCallback(
    (customer: Customer) => {
      setValue('customer', customer, { shouldDirty: true, shouldValidate: true });
      setPane('edit');
      toast.success('Customer filled in', customer.company || customer.name);
    },
    [setValue, toast],
  );

  const addProduct = useCallback(
    (product: { name: string; description: string; unitPrice: number; taxRate: number }) => {
      const items = getValues('items') ?? [];
      const nextItems = [...items, createLineItem(product)];
      setValue('items', nextItems, { shouldDirty: true });
      setPane('edit');
      toast.success('Item added', product.name);
    },
    [getValues, setValue, toast],
  );

  const paletteActions = useMemo<PaletteActions>(
    () => ({
      newInvoice: () => setConfirmReset(true),
      save: saveInvoice,
      print: printInvoice,
      downloadPdf,
      toggleTheme,
      openInvoice,
      applyCustomer,
      addProduct,
    }),
    [saveInvoice, printInvoice, downloadPdf, toggleTheme, openInvoice, applyCustomer, addProduct],
  );

  useHotkeys({
    'mod+s': saveInvoice,
    'mod+p': printInvoice,
    'mod+d': downloadPdf,
    'mod+k': () => setPaletteOpen((open) => !open),
    'mod+shift+n': () => setConfirmReset(true),
    'mod+shift+h': () => setHistoryOpen((open) => !open),
  });

  const currentId = watch('id');

  return (
    <div data-print-path className="flex min-h-dvh flex-col">
      <a
        href="#editor"
        className="sr-only-focusable absolute left-4 top-4 z-[300] rounded-xl bg-surface px-4 py-2 text-sm font-semibold text-fg shadow-pop ring-1 ring-hairline"
      >
        Skip to the invoice editor
      </a>

      <Navbar
        onNewInvoice={() => setConfirmReset(true)}
        onSave={saveInvoice}
        onPrint={printInvoice}
        onDownload={downloadPdf}
        onDownloadImage={downloadImage}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenSearch={() => setPaletteOpen(true)}
        savedAt={savedAt}
        saving={saving}
        exporting={exporting}
        savedCount={archive.history.entries.length}
      />

      <FormProvider {...form}>
        <main
          data-print-path
          id="editor"
          className="desk mx-auto w-full max-w-[1800px] flex-1 px-4 pb-16 pt-5 sm:px-6"
        >
          {/* Mobile switches between the form and the paper; desktop shows both. */}
          <div className="no-print mb-4 lg:hidden">
            <SegmentedControl
              aria-label="Editor view"
              fullWidth
              value={pane}
              onChange={setPane}
              segments={[
                { value: 'edit', label: 'Edit', icon: <PencilLine className="h-3.5 w-3.5" /> },
                { value: 'preview', label: 'Preview', icon: <Eye className="h-3.5 w-3.5" /> },
              ]}
            />
          </div>

          {/* Entrance is a CSS animation, not a JS one: if rAF is throttled — a
              background tab, a restored session — the content must still end up
              visible rather than stuck at the initial keyframe. */}
          <div
            data-print-path
            className="animate-fade-up flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8"
          >
            {/* ── Editor column ─────────────────────────────────────────── */}
            <div
              className={cn(
                'min-w-0 flex-1 space-y-4 lg:max-w-[46rem]',
                pane === 'edit' ? 'block' : 'hidden lg:block',
              )}
            >
              <BusinessSection />
              <CustomerSection />
              <DetailsSection />
              <ItemsSection />
              <AdjustmentsSection />
              <NotesSection />

              <div className="no-print hidden lg:block">
                <TotalsSidecar fallback={bootstrap} />
              </div>

              <div className="no-print flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  leftIcon={<Sparkles className="h-4 w-4" />}
                  onClick={() => {
                    reset(normalizeInvoice(createSampleInvoice()));
                    toast.info('Sample invoice loaded', 'Edit any field to make it yours.');
                  }}
                >
                  Load the sample
                </Button>
                <Button
                  variant="ghost"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setConfirmReset(true)}
                  className="text-danger-400 hover:bg-danger-400/10 hover:text-danger-400"
                >
                  Start over
                </Button>
              </div>
            </div>

            {/* ── Preview column ────────────────────────────────────────── */}
            <div
              data-print-path
              className={cn(
                'min-w-0 flex-1',
                'lg:sticky lg:top-[calc(var(--nav-h)+1.25rem)]',
                pane === 'preview' ? 'block' : 'hidden lg:block',
              )}
            >
              <PreviewColumn fallback={bootstrap} />
            </div>
          </div>
        </main>
      </FormProvider>

      <footer className="no-print border-t border-hairline bg-surface/60">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Ledger runs entirely in your browser. Invoices, logos and history stay on this device —
            nothing is uploaded.
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-2xs">
            <li>⌘K search</li>
            <li>⌘S save</li>
            <li>⌘D PDF</li>
            <li>⌘P print</li>
            <li>⇧⌘N new</li>
          </ul>
        </div>
      </footer>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onOpenInvoice={openInvoice}
        currentId={currentId}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={paletteActions}
      />

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Start a new invoice?"
        description="Your business details, template and terms carry over. The customer and items are cleared."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Keep editing
            </Button>
            <Button variant="primary" data-autofocus onClick={startNewInvoice}>
              Start new invoice
            </Button>
          </>
        }
      >
        <CurrentInvoiceSummary />
      </Modal>

      {/* Full-screen progress while the PDF renders — the one blocking moment. */}
      <AnimatePresence>
        {exporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="no-print fixed inset-0 z-[250] grid place-items-center bg-canvas/70 backdrop-blur-sm"
            role="status"
            aria-live="assertive"
          >
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface px-8 py-7 shadow-pop ring-1 ring-hairline">
              <span className="grad-brand h-9 w-9 animate-spin rounded-full [mask:radial-gradient(farthest-side,transparent_58%,#000_60%)]" />
              <p className="text-sm font-semibold text-fg">Building your PDF</p>
              <p className="max-w-[26ch] text-center text-xs text-muted">
                Rendering the sheet at print resolution. This takes a moment on long invoices.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  /** Small helper rendered inside the reset dialog. */
  function CurrentInvoiceSummary() {
    const values = getValues();
    const totals = calculateTotals(normalizeInvoice(values));
    return (
      <p className="text-sm text-muted">
        The invoice on screen — <span className="font-mono text-fg">{values.number}</span>, worth{' '}
        <span className="font-mono text-fg">
          {new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: values.currencyCode || 'USD',
          }).format(totals.grandTotal)}
        </span>{' '}
        — is saved as a draft. Save it first if you want it in your history.
      </p>
    );
  }
}
