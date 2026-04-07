import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type BackendMode = 'hermes' | 'generic' | 'offline';

interface ConnectionState {
  mode: BackendMode;
  online: boolean;
  lastCheck: number;
}

const ConnectionContext = createContext<ConnectionState>({
  mode: 'hermes',
  online: true,
  lastCheck: Date.now(),
});

export function useConnection(): ConnectionState {
  return useContext(ConnectionContext);
}

/** Routes that require a live Hermes backend */
export const HERMES_ONLY_ROUTES = new Set(['skills', 'memory', 'jobs']);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConnectionState>({
    mode: 'hermes',
    online: true,
    lastCheck: Date.now(),
  });

  useEffect(() => {
    let active = true;

    async function healthCheck() {
      try {
        const res = await fetch('/api/gui/metrics/global', { signal: AbortSignal.timeout(4000) });
        if (!res.ok) throw new Error('not ok');
        const data = await res.json();
        if (active) {
          setState({
            mode: data.ok ? 'hermes' : 'generic',
            online: true,
            lastCheck: Date.now(),
          });
        }
      } catch {
        if (active) {
          setState(prev => ({
            ...prev,
            mode: 'offline',
            online: false,
            lastCheck: Date.now(),
          }));
        }
      }
    }

    healthCheck();
    const interval = setInterval(healthCheck, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <ConnectionContext.Provider value={state}>
      {children}
    </ConnectionContext.Provider>
  );
}
