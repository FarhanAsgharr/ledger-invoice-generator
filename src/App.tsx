import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Workspace } from '@/components/layout/Workspace';
import { ArchiveProvider } from '@/context/ArchiveContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { runMigrations } from '@/lib/storage';

export default function App() {
  useEffect(() => {
    runMigrations();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ArchiveProvider>
            <Workspace />
          </ArchiveProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
