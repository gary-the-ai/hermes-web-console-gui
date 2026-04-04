import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { TerminalHost } from '../components/drawer/TerminalHost';

interface LogsResponse {
  ok: boolean;
  logs?: string[];
}

export function LogsPage() {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchLogs = () => {
      apiClient
        .get<LogsResponse>('/logs')
        .then((response) => {
          if (!active) return;
          setLoading(false);
          if (response.ok && response.logs?.length) {
            setLines(response.logs);
          }
        })
        .catch(() => {
          if (active) setLoading(false);
        });
    };

    fetchLogs();
    const pollId = setInterval(fetchLogs, 5000);

    return () => {
      active = false;
      clearInterval(pollId);
    };
  }, []);

  if (loading && lines.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        Loading system logs…
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', color: '#94a3b8' }}>
        System Logs
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <TerminalHost logs={lines} />
        </div>
      </div>
    </div>
  );
}
