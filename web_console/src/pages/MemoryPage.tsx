import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { MemoryList } from '../components/memory/MemoryList';

interface MemoryResponse {
  ok: boolean;
  memory?: { content?: string };
}

interface UserProfileResponse {
  ok: boolean;
  user_profile?: { content?: string };
}

function parseMemoryLines(raw: string): Array<{ id: string; title: string; body: string }> {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({
      id: `mem-${btoa(unescape(encodeURIComponent(line))).slice(0, 16)}`,
      title: 'Persistent memory',
      body: line,
    }));
}

export function MemoryPage() {
  const [memoryItems, setMemoryItems] = useState<Array<{ id: string; title: string; body: string }>>([]);
  const [profileItems, setProfileItems] = useState<Array<{ id: string; title: string; body: string }>>([]);
  const [activeTab, setActiveTab] = useState<'memory' | 'profile'>('memory');

  const refreshMemory = async () => {
    try {
      const [memRes, profileRes] = await Promise.all([
        apiClient.get<MemoryResponse>('/memory').catch(() => null),
        apiClient.get<UserProfileResponse>('/user-profile').catch(() => null),
      ]);
      if (memRes?.ok && memRes.memory?.content) {
        setMemoryItems(parseMemoryLines(memRes.memory.content));
      }
      if (profileRes?.ok && profileRes.user_profile?.content) {
        setProfileItems(
          parseMemoryLines(profileRes.user_profile.content).map((item) => ({
            ...item,
            title: 'User profile',
          }))
        );
      }
    } catch {
      // keep existing state
    }
  };

  useEffect(() => {
    refreshMemory();
  }, []);

  const handleAddMemory = async (content: string) => {
    await apiClient.post('/memory', { target: 'memory', content });
    await refreshMemory();
  };

  const handleEditMemory = async (oldText: string, newText: string) => {
    await apiClient.patch('/memory', { target: 'memory', old_text: oldText, content: newText });
    await refreshMemory();
  };

  const handleDeleteMemory = async (text: string) => {
    await apiClient.del('/memory', { target: 'memory', old_text: text });
    await refreshMemory();
  };

  const handleAddProfile = async (content: string) => {
    await apiClient.post('/memory', { target: 'user', content });
    await refreshMemory();
  };

  const handleEditProfile = async (oldText: string, newText: string) => {
    await apiClient.patch('/memory', { target: 'user', old_text: oldText, content: newText });
    await refreshMemory();
  };

  const handleDeleteProfile = async (text: string) => {
    await apiClient.del('/memory', { target: 'user', old_text: text });
    await refreshMemory();
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    cursor: 'pointer',
    borderBottom: isActive ? '2px solid #818cf8' : '2px solid transparent',
    color: isActive ? '#e2e8f0' : '#64748b',
    fontWeight: isActive ? 600 : 400,
    fontSize: '0.9rem',
    background: 'transparent',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
  });

  return (
    <section style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '16px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('memory')}
          style={tabStyle(activeTab === 'memory')}
        >
          Session Memory
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          style={tabStyle(activeTab === 'profile')}
        >
          User Profile
        </button>
      </div>

      {activeTab === 'memory' && (
        <MemoryList
          title="🧠 Agent Episodic Memory"
          description="Facts the agent has chosen to remember across sessions."
          items={memoryItems}
          onAdd={handleAddMemory}
          onEdit={handleEditMemory}
          onDelete={handleDeleteMemory}
        />
      )}

      {activeTab === 'profile' && (
        <MemoryList
          title="👤 Explicit User Profile"
          description="A dedicated profile for the agent outlining context, preferences, and details it knows about you."
          items={profileItems}
          onAdd={handleAddProfile}
          onEdit={handleEditProfile}
          onDelete={handleDeleteProfile}
        />
      )}
    </section>
  );
}
