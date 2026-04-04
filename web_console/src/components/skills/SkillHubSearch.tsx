import { useState } from 'react';
import { apiClient } from '../../lib/api';
import { toastStore } from '../../store/toastStore';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface HubSkill {
  name: string;
  description: string;
  source: string;
  trust_level: string;
  identifier: string;
  tags: string[];
}

interface SkillHubSearchProps {
  onInstallComplete: () => void;
}

const TRUST_COLORS: Record<string, { bg: string; color: string }> = {
  trusted: { bg: 'rgba(34, 197, 94, 0.15)', color: '#86efac' },
  verified: { bg: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc' },
  community: { bg: 'rgba(251, 191, 36, 0.15)', color: '#fde68a' },
  builtin: { bg: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc' },
  unknown: { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8' },
};

export function SkillHubSearch({ onInstallComplete }: SkillHubSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HubSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await apiClient.get<{ ok: boolean; results: HubSkill[] }>(
        `/skills/hub/search?q=${encodeURIComponent(query)}`
      );
      if (res.ok) setResults(res.results || []);
    } catch (err) {
      toastStore.error('Search Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (skill: HubSkill) => {
    setInstalling(skill.identifier);
    try {
      const res = await apiClient.post<{ ok: boolean; installed: string; path: string }>(
        '/skills/hub/install',
        { identifier: skill.identifier }
      );
      if (res.ok) {
        toastStore.success('Skill Installed', `${skill.name} has been installed and is ready to load.`);
        onInstallComplete();
      }
    } catch (err) {
      toastStore.error('Installation Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setInstalling(null);
    }
  };

  return (
    <section
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        padding: '20px',
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.1rem' }}>🌐 Skills Hub</h2>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
          Search for pre-built agent skills in the community registry.
        </p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search skills (e.g. 'linear', 'browserbase')..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#f8fafc',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 16px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#818cf8',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {loading && <LoadingSpinner message="Searching skills hub..." />}

      {!loading && hasSearched && results.length === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
          No skills found matching "{query}"
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {results.map((skill) => {
            const trustStyle = TRUST_COLORS[skill.trust_level] || TRUST_COLORS.unknown;
            const isInstalling = installing === skill.identifier;

            return (
              <div
                key={skill.identifier}
                style={{
                  padding: '14px 16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1, paddingRight: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>{skill.name}</strong>
                    {skill.source === 'official' && (
                      <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', color: '#7dd3fc', padding: '1px 6px', borderRadius: '4px' }}>
                        ★ official
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', background: trustStyle.bg, color: trustStyle.color, padding: '1px 6px', borderRadius: '4px' }}>
                      {skill.trust_level}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>{skill.description}</p>
                </div>

                <button
                  onClick={() => handleInstall(skill)}
                  disabled={isInstalling || installing !== null}
                  style={{
                    padding: '6px 14px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#86efac',
                    borderRadius: '8px',
                    cursor: installing !== null ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    whiteSpace: 'nowrap',
                    opacity: installing !== null ? 0.6 : 1,
                  }}
                >
                  {isInstalling ? 'Installing...' : 'Install'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
