import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import { toastStore } from '../../store/toastStore';

interface ModelInfo {
  id: string;
  description: string;
}

interface ProviderInfo {
  id: string;
  label: string;
  aliases: string[];
  authenticated: boolean;
  models: ModelInfo[];
}

export function ModelPicker() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [activeProvider, setActiveProvider] = useState<string>('');
  const [activeModel, setActiveModel] = useState<string>('');
  const [fallbackProviders, setFallbackProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalog = async () => {
    try {
      const res = await apiClient.get<{ ok: boolean; providers: ProviderInfo[] }>('/models/catalog');
      if (res.ok) {
        setProviders(res.providers || []);
      }
    } catch (err) {
      toastStore.error('Catalog Load Failed', err instanceof Error ? err.message : String(err));
    }
  };

  const fetchActive = async () => {
    try {
      const res = await apiClient.get<{ ok: boolean; settings: any }>('/settings');
      if (res.ok && res.settings) {
        if (res.settings.model) {
          setActiveProvider(res.settings.model.provider || '');
          // The backend `run.py` prefers "default" first.
          setActiveModel(res.settings.model.default || res.settings.model.model || res.settings.model.name || '');
        }
        if (Array.isArray(res.settings.fallback_providers)) {
          setFallbackProviders(res.settings.fallback_providers);
        }
      }
    } catch (err) {
      toastStore.error('Active Model Load Failed', err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    Promise.all([fetchCatalog(), fetchActive()]).finally(() => setLoading(false));
  }, []);

  const handleSave = async (providerId: string, modelId: string) => {
    setActiveProvider(providerId);
    setActiveModel(modelId);
    try {
      await apiClient.patch('/settings', {
        // Must patch "default" since that is the canonical config key read by gateway and CLI
        model: { provider: providerId, default: modelId, name: modelId }
      });
      toastStore.success('Model Changed', `${modelId} on ${providerId}`);
    } catch (err) {
      toastStore.error('Failed to save model', err instanceof Error ? err.message : String(err));
    }
  };

  const handleSaveFallbacks = async (newFallbacks: string[]) => {
    setFallbackProviders(newFallbacks);
    try {
      await apiClient.patch('/settings', { fallback_providers: newFallbacks });
      toastStore.success('Fallback Chain Saved', `Chain length: ${newFallbacks.length}`);
    } catch (err) {
      toastStore.error('Failed to save fallbacks', err instanceof Error ? err.message : String(err));
      fetchActive(); // revert
    }
  };

  const moveFallback = (index: number, direction: -1 | 1) => {
    const newFallbacks = [...fallbackProviders];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newFallbacks.length) return;
    [newFallbacks[index], newFallbacks[targetIndex]] = [newFallbacks[targetIndex], newFallbacks[index]];
    handleSaveFallbacks(newFallbacks);
  };

  const removeFallback = (index: number) => {
    const newFallbacks = [...fallbackProviders];
    newFallbacks.splice(index, 1);
    handleSaveFallbacks(newFallbacks);
  };

  const addFallback = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    if (fallbackProviders.includes(val)) {
      toastStore.error('Already in chain', `${val} is already a fallback provider`);
      return;
    }
    handleSaveFallbacks([...fallbackProviders, val]);
    e.target.value = ''; // reset select
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#94a3b8' }}>Loading models...</div>;
  }

  const selectedProvider = providers.find(p => p.id === activeProvider) || providers[0];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '32px'
    }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🧠</span> Default Model & Provider
      </h2>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>
            Provider
          </label>
          <select
            value={activeProvider}
            onChange={(e) => {
              const newProviderId = e.target.value;
              const newProvider = providers.find(p => p.id === newProviderId);
              const newModelId = newProvider?.models?.[0]?.id || '';
              handleSave(newProviderId, newModelId);
            }}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f8fafc',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} {p.authenticated ? '(Ready)' : '(Setup required)'}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>
            Model (Select from recommended)
          </label>
          <select
            value={activeModel}
            onChange={(e) => handleSave(activeProvider, e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f8fafc',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          >
            {selectedProvider?.models?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} {m.description ? `(${m.description})` : ''}
              </option>
            ))}
            {/* Fallback option if model isn't in catalog but is active */}
            {!selectedProvider?.models?.find(m => m.id === activeModel) && activeModel && (
              <option value={activeModel}>{activeModel} (Custom)</option>
            )}
          </select>

          <label style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>
            <span>Or Enter Custom Model ID</span>
            <button 
              onClick={() => handleSave(activeProvider, activeModel)}
              style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.8rem', padding: 0, fontWeight: 'bold' }}
              title="Click to save custom model"
            >
              SAVE CUSTOM
            </button>
          </label>
          <input
            type="text"
            value={activeModel}
            onChange={(e) => setActiveModel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(activeProvider, activeModel); }}
            placeholder="e.g. google/gemma-3-27b-it"
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid #38bdf855',
              color: '#f8fafc',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          />
        </div>
      </div>
      <p style={{ marginTop: '16px', fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5 }}>
        Select the default AI provider and model used for conversations and tool execution. Authentication is handled in the setup wizard or `<code style={{background:'rgba(0,0,0,0.3)', padding:'2px 4px', borderRadius:'4px'}}>~/.hermes/.env</code>`. To use a custom OpenRouter model, enter its exact ID in the text field and press Enter or Save.
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '24px 0' }} />

      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🔗</span> Fallback Provider Chain
      </h3>
      <p style={{ marginBottom: '16px', fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5 }}>
        If the primary provider fails (e.g. rate limit, server error), Hermes will automatically retry the request using providers in this chain, in order.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {fallbackProviders.length === 0 ? (
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center' }}>
            No fallback providers configured.
          </div>
        ) : fallbackProviders.map((prov, i) => (
          <div key={prov} style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                background: 'rgba(255,255,255,0.1)', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 'bold' 
              }}>
                {i + 1}
              </span>
              <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{prov}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={() => moveFallback(i, -1)} 
                disabled={i === 0}
                style={{ background: 'none', border: 'none', color: i === 0 ? '#475569' : '#94a3b8', cursor: i === 0 ? 'default' : 'pointer', padding: '4px' }}
                title="Move Up"
              >
                ⬆️
              </button>
              <button 
                onClick={() => moveFallback(i, 1)} 
                disabled={i === fallbackProviders.length - 1}
                style={{ background: 'none', border: 'none', color: i === fallbackProviders.length - 1 ? '#475569' : '#94a3b8', cursor: i === fallbackProviders.length - 1 ? 'default' : 'pointer', padding: '4px' }}
                title="Move Down"
              >
                ⬇️
              </button>
              <button 
                onClick={() => removeFallback(i)} 
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', marginLeft: '8px' }}
                title="Remove"
              >
                ✖
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <select 
          onChange={addFallback} 
          defaultValue=""
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#f8fafc',
            borderRadius: '6px',
            fontSize: '0.9rem'
          }}
        >
          <option value="" disabled>+ Add Provider to Chain...</option>
          {providers.filter(p => !fallbackProviders.includes(p.id)).map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
