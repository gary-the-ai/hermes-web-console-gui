import { useEffect, useMemo, useState } from 'react';
import { ROUTES } from '../../app/router';
import type { DrawerTab, InspectorTab, ModalTab, PrimaryRoute } from '../../lib/types';
import { ChatPage } from '../../pages/ChatPage';
import { SessionsPage } from '../../pages/SessionsPage';
import { WorkspacePage } from '../../pages/WorkspacePage';
import { UsagePage } from '../../pages/UsagePage';
import { JobsPage } from '../../pages/JobsPage';
import { SkillsPage } from '../../pages/SkillsPage';
import { MemoryPage } from '../../pages/MemoryPage';
import { initialUiState, setInspectorTab, setRoute, toggleDrawer, toggleInspector, toggleModal, toggleVoiceMode } from '../../store/uiStore';
import { BottomDrawer } from './BottomDrawer';
import { Inspector } from './Inspector';
import { TopBar } from './TopBar';
import { ControlCenterModal } from './ControlCenterModal';
import { Toaster } from '../shared/Toaster';
import { ArtifactViewer } from '../chat/ArtifactViewer';

function RouteContent({ routeId, voiceMode }: { routeId: PrimaryRoute; voiceMode: boolean }) {
  if (routeId === 'chat') return <ChatPage voiceMode={voiceMode} />;
  if (routeId === 'sessions') return <SessionsPage />;
  if (routeId === 'workspace') return <WorkspacePage />;
  if (routeId === 'usage') return <UsagePage />;
  if (routeId === 'jobs') return <JobsPage />;
  if (routeId === 'skills') return <SkillsPage />;
  if (routeId === 'memory') return <MemoryPage />;
  return null;
}

export function AppShell() {
  const [uiState, setUiState] = useState(initialUiState);
  const route = useMemo(() => ROUTES.find((item) => item.id === uiState.route) ?? ROUTES[0], [uiState.route]);

  const navigate = (nextRoute: PrimaryRoute) => setUiState((current) => setRoute(current, nextRoute));
  const selectInspectorTab = (tab: InspectorTab) => setUiState((current) => setInspectorTab(current, tab));
  const selectDrawerTab = (tab: DrawerTab) => setUiState((current) => toggleDrawer(current, tab));
  const selectModalTab = (tab: ModalTab) => setUiState((current) => toggleModal(current, tab));

  // Hash Routing Deep Linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      const parts = hash.split('/');
      const nextRoute = parts[0] as PrimaryRoute;
      
      if (['chat', 'sessions', 'workspace', 'usage', 'jobs', 'skills', 'memory'].includes(nextRoute)) {
        if (uiState.route !== nextRoute) {
          setUiState(current => setRoute(current, nextRoute));
        }
      }
    };
    
    if (window.location.hash) {
      handleHashChange();
    }
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const handleOpenArtifact = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: string; content: string }>;
      setUiState(current => ({
        ...current,
        artifactOpen: true,
        artifactType: customEvent.detail.type,
        artifactContent: customEvent.detail.content
      }));
    };
    window.addEventListener('hermes:openArtifact', handleOpenArtifact);
    return () => window.removeEventListener('hermes:openArtifact', handleOpenArtifact);
  }, []);

  // Sync hash to state changes
  useEffect(() => {
    const currentHashRoute = window.location.hash.replace('#/', '').split('/')[0];
    if (currentHashRoute !== uiState.route) {
      const remainingHash = window.location.hash.replace('#/', '').split('/').slice(1).join('/');
      window.location.hash = `/${uiState.route}${remainingHash && currentHashRoute === uiState.route ? '/' + remainingHash : ''}`;
    }
  }, [uiState.route]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '1') { e.preventDefault(); navigate('chat'); }
        if (e.key === '2') { e.preventDefault(); navigate('sessions'); }
        if (e.key === '3') { e.preventDefault(); navigate('workspace'); }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <TopBar
        title="Hermes"
        navItems={ROUTES}
        activeRoute={uiState.route}
        onNavigate={navigate}
        onToggleSettings={() => setUiState((current) => toggleModal(current))}
        onToggleInspector={() => setUiState((current) => toggleInspector(current))}
        onToggleDrawer={() => setUiState((current) => toggleDrawer(current))}
        voiceMode={uiState.voiceMode}
        onToggleVoiceMode={() => setUiState((current) => toggleVoiceMode(current))}
      />

      <div className="layout-body">
        <main className="content" aria-label="Main content">
          <RouteContent routeId={route.id} voiceMode={uiState.voiceMode} />
        </main>

        <Inspector open={uiState.inspectorOpen} activeTab={uiState.inspectorTab} onTabChange={selectInspectorTab} />
      </div>

      <BottomDrawer open={uiState.drawerOpen} activeTab={uiState.drawerTab} onTabChange={selectDrawerTab} />

      <ControlCenterModal 
        open={uiState.modalOpen} 
        activeTab={uiState.modalTab} 
        onTabChange={selectModalTab} 
        onClose={() => setUiState((current) => toggleModal(current))} 
      />
      <ArtifactViewer uiState={uiState} setUiState={setUiState} />
      <Toaster />
    </div>
  );
}
