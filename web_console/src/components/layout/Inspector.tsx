import type { InspectorTab } from '../../lib/types';
import { cx } from '../../lib/utils';
import { MemoryPage } from '../../pages/MemoryPage';
import { LogsPage } from '../../pages/LogsPage';
import { BrowserControlPanel } from '../browser/BrowserControlPanel';
import { RunPanel } from '../inspector/RunPanel';
import { ToolsPanel } from '../inspector/ToolsPanel';
import { TodoPanel } from '../inspector/TodoPanel';
import { SessionPanel } from '../inspector/SessionPanel';
import { HumanPanel } from '../inspector/HumanPanel';

const INSPECTOR_TABS: InspectorTab[] = ['run', 'tools', 'todo', 'session', 'human', 'memory', 'logs', 'browser'];

interface InspectorProps {
  open: boolean;
  activeTab: InspectorTab;
  onTabChange(tab: InspectorTab): void;
}

export function Inspector({ open, activeTab, onTabChange }: InspectorProps) {
  return (
    <aside className={cx('inspector', !open && 'inspector-hidden')} aria-label="Inspector">
      <div className="panel-tabs">
        {INSPECTOR_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={cx('panel-tab', activeTab === tab && 'panel-tab-active')}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="panel-body">
        {activeTab === 'run' ? (
          <RunPanel />
        ) : activeTab === 'tools' ? (
          <ToolsPanel />
        ) : activeTab === 'todo' ? (
          <TodoPanel />
        ) : activeTab === 'session' ? (
          <SessionPanel />
        ) : activeTab === 'human' ? (
          <HumanPanel />
        ) : activeTab === 'memory' ? (
          <MemoryPage />
        ) : activeTab === 'logs' ? (
          <LogsPage />
        ) : activeTab === 'browser' ? (
          <BrowserControlPanel />
        ) : (
          <>
            <h2>{activeTab}</h2>
            <p>Inspector scaffold for {activeTab} details.</p>
          </>
        )}
      </div>
    </aside>
  );
}
