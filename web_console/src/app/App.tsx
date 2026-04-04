import { AppShell } from '../components/layout/AppShell';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
