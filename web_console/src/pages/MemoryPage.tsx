import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { toastStore } from '../store/toastStore';
import { EmptyState } from '../components/shared/EmptyState';

export function MemoryPage() {
  const [content, setContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemory();
  }, []);

  const loadMemory = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ ok: boolean; content: string }>('/memory');
      if (res.ok) {
        setContent(res.content);
        setEditContent(res.content);
      }
    } catch (err) {
      toastStore.error('Failed to load memory', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const saveMemory = async () => {
    try {
      const res = await apiClient.post<{ ok: boolean }>('/memory', { content: editContent });
      if (res.ok) {
        setContent(editContent);
        setIsEditing(false);
        toastStore.success('Memory updated', 'Automatically synced to MEMORY.md');
      }
    } catch (err) {
      toastStore.error('Failed to save memory', err instanceof Error ? err.message : String(err));
    }
  };

  if (loading) {
    return <EmptyState title="Loading Memory..." description="Fetching core memories from DB..." icon="🧠" />;
  }

  return (
    <div className="layout-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem', overflow: 'hidden' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>🧠</span> Agent Memory
          </h2>
          <p style={{ color: '#94a3b8', margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
            What Hermes remembers about you and the workspace context across sessions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {isEditing ? (
            <>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(content);
                }}
                style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={saveMemory}
                style={{ padding: '0.5rem 1rem', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
              >
                Save Changes
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              style={{ padding: '0.5rem 1rem', background: '#334155', border: 'none', color: '#f8fafc', borderRadius: '4px', cursor: 'pointer' }}
            >
              Edit Memory
            </button>
          )}
        </div>
      </header>

      <div style={{ flex: 1, overflow: 'auto', background: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}>
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{
              width: '100%',
              height: '100%',
              padding: '1.5rem',
              background: 'transparent',
              border: 'none',
              color: '#e2e8f0',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              resize: 'none',
              lineHeight: 1.5,
              outline: 'none'
            }}
            spellCheck="false"
          />
        ) : (
          <div style={{ padding: '1.5rem', color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontFamily: 'monospace' }}>
            {content || <span style={{ color: '#64748b', fontStyle: 'italic' }}>No memories recorded yet. The agent will add facts here automatically during conversations.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
