import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api';
import { toastStore } from '../../store/toastStore';
import type { NavItem, PrimaryRoute } from '../../lib/types';

interface TopBarProps {
  title: string;
  navItems: readonly NavItem[];
  activeRoute: PrimaryRoute;
  onNavigate(route: PrimaryRoute): void;
  onToggleSettings(): void;
  onToggleInspector(): void;
  onToggleDrawer(): void;
  voiceMode: boolean;
  onToggleVoiceMode(): void;
}

interface VersionResponse {
  ok: boolean;
  version?: string;
  release_date?: string;
}

interface UpdateResponse {
  ok: boolean;
  current_version: string;
  latest_version: string;
  has_update: boolean;
  project_url: string;
}

const NAV_ICONS: Record<string, string> = {
  chat: '💬',
  sessions: '📋',
  workspace: '📂',
  usage: '📊',
  jobs: '⚡',
  skills: '✨',
  memory: '🧠'
};

export function TopBar({ title, navItems, activeRoute, onNavigate, onToggleSettings, onToggleDrawer, onToggleInspector, voiceMode, onToggleVoiceMode }: TopBarProps) {
  const [version, setVersion] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateResponse | null>(null);

  useEffect(() => {
    apiClient.get<VersionResponse>('/version')
      .then(res => {
        if (res.ok && res.version) {
          setVersion(`v${res.version}`);
        }
      })
      .catch(() => {});

    apiClient.get<any>('/profiles')
      .then(res => {
        if (res.ok && res.active_profile) {
          setActiveProfile(res.active_profile);
        }
      })
      .catch(() => {});
  }, []);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const res = await apiClient.get<UpdateResponse>('/version/check');
      if (res.ok) {
        setUpdateInfo(res);
        if (res.has_update) {
          toastStore.info('Update Available!', `Version v${res.latest_version} is available. Visit ${res.project_url} for details.`);
        } else {
          toastStore.success('Up to date!', `You are running the latest version (v${res.current_version}).`);
        }
      }
    } catch (err) {
      toastStore.error('Update Check Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <header className="topbar">
      {/* Left: Brand + version */}
      <div className="topbar-brand">
        <span className="topbar-logo">⚕</span>
        <h1>{title}</h1>
        {version && (
          <span className="topbar-version">
            {version}
            <button
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              title="Check for updates"
              className="topbar-update-btn"
              style={{
                opacity: checkingUpdate ? 0.5 : 1,
                color: updateInfo?.has_update ? '#38bdf8' : undefined,
              }}
            >
              {checkingUpdate ? '⏳' : updateInfo?.has_update ? '⬆️' : '🔄'}
            </button>
          </span>
        )}
        {activeProfile && activeProfile !== 'default' && (
          <span className="topbar-profile-badge">
            {activeProfile}
          </span>
        )}
      </div>

      {/* Center: Navigation tabs */}
      <nav className="topbar-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`topbar-nav-item ${activeRoute === item.id ? 'topbar-nav-item--active' : ''}`}
            onClick={() => onNavigate(item.id)}
            title={item.description}
          >
            <span className="topbar-nav-icon">{NAV_ICONS[item.id] || '📄'}</span>
            <span className="topbar-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Right: Action buttons */}
      <div className="topbar-actions">
        <button 
          type="button" 
          className="topbar-action-btn" 
          onClick={onToggleVoiceMode} 
          title="Voice Mode (Text-to-Speech)"
          style={voiceMode ? { color: '#fcd34d', background: 'rgba(252, 211, 77, 0.15)' } : {}}
        >
          {voiceMode ? '🔊' : '🔈'}
        </button>
        <button type="button" className="topbar-action-btn" onClick={onToggleSettings} title="Control Center">
          ⚙️
        </button>
        <button type="button" className="topbar-action-btn" onClick={onToggleInspector} title="Inspector Panel">
          🖥️
        </button>
        <button type="button" className="topbar-action-btn" onClick={onToggleDrawer} title="Terminal Drawer">
          ⌨️
        </button>
      </div>
    </header>
  );
}
