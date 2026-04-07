import { AppShell } from '../components/layout/AppShell';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';
import { ConnectionProvider } from '../lib/connectionContext';

export function App() {
  return (
    <ErrorBoundary>
      <ConnectionProvider>
        <AppShell />
      </ConnectionProvider>
    </ErrorBoundary>
  );
}
