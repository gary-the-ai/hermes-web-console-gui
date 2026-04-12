import { useState } from 'react';
import { apiClient } from '../../lib/api';
import { getBackendUrl } from '../../store/backendStore';
import { toastStore } from '../../store/toastStore';

export function SystemManager() {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ restored?: number; total?: number; errors?: string[] } | null>(null);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const base = getBackendUrl();
      const res = await fetch(`${base}/api/gui/system/backup`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'hermes-backup.zip';
      const fileCount = res.headers.get('X-Backup-Files') || '?';

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

      toastStore.success(`Backup Downloaded`, `${fileCount} files saved as ${filename}`);
    } catch (err) {
      toastStore.error('Backup Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async (file: File) => {
    setRestoring(true);
    setRestoreResult(null);
    try {
      const base = getBackendUrl();
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${base}/api/gui/system/restore`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || 'Restore failed');
      }
      setRestoreResult({ restored: data.restored, total: data.total, errors: data.errors });
      toastStore.success('Restore Complete', `${data.restored}/${data.total} files restored`);
    } catch (err) {
      toastStore.error('Restore Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setRestoring(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '20px',
  };

  const btnBase: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.12)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#e2e8f0' }}>
        💾 System Backup & Restore
      </h3>
      <p style={{ margin: '0 0 16px 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
        Download a full backup of your Hermes state (config, sessions, memories, skills, API keys) 
        or restore from a previous backup archive.
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Backup Button */}
        <button
          onClick={handleBackup}
          disabled={backingUp}
          style={{
            ...btnBase,
            background: backingUp ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.12)',
            color: '#7dd3fc',
            opacity: backingUp ? 0.6 : 1,
          }}
        >
          {backingUp ? (
            <>⏳ Creating backup…</>
          ) : (
            <>📦 Download Backup</>
          )}
        </button>

        {/* Restore Button / File Input */}
        <label
          style={{
            ...btnBase,
            background: restoring ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.12)',
            color: '#fde68a',
            opacity: restoring ? 0.6 : 1,
            cursor: restoring ? 'wait' : 'pointer',
          }}
        >
          {restoring ? (
            <>⏳ Restoring…</>
          ) : (
            <>📥 Restore from Backup</>
          )}
          <input
            type="file"
            accept=".zip"
            disabled={restoring}
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleRestore(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {/* Restore Result */}
      {restoreResult && (
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: restoreResult.errors && restoreResult.errors.length > 0
            ? 'rgba(251,191,36,0.08)'
            : 'rgba(74,222,128,0.08)',
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.78rem',
          color: '#94a3b8',
          lineHeight: 1.6,
        }}>
          <div style={{ color: '#e2e8f0', fontWeight: 500, marginBottom: '4px' }}>
            ✓ Restore complete: {restoreResult.restored}/{restoreResult.total} files
          </div>
          {restoreResult.errors && restoreResult.errors.length > 0 && (
            <div style={{ color: '#fbbf24', marginTop: '4px' }}>
              ⚠ {restoreResult.errors.length} file(s) skipped:
              {restoreResult.errors.slice(0, 5).map((e, i) => (
                <div key={i} style={{ paddingLeft: '12px', fontSize: '0.72rem' }}>{e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
