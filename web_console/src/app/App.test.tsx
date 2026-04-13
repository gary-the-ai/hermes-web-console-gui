import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { PRIMARY_NAV_ITEMS } from './router';

class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockEventSource.lastInstance = this;
  }

  close() {
    // no-op
  }

  static lastInstance: MockEventSource | null = null;

  simulateMessage(data: unknown) {
    const payload = { data: JSON.stringify(data) } as MessageEvent;
    this.onmessage?.(payload);
  }
}

describe('App shell', () => {
  beforeEach(() => {
    global.EventSource = MockEventSource as unknown as typeof EventSource;
    MockEventSource.lastInstance = null;
    window.location.hash = '';
    localStorage.clear();

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/gui/human/pending')) {
        return new Response(JSON.stringify({ ok: true, pending: [] }), { status: 200 });
      }
      if (url.includes('/api/gui/chat/send')) {
        return new Response(
          JSON.stringify({ ok: true, session_id: 'session-live', run_id: 'run-1', status: 'started' }),
          { status: 200 }
        );
      }
      if (url.includes('/api/gui/user-profile')) {
        return new Response(
          JSON.stringify({ ok: true, user_profile: { target: 'user', enabled: true, entries: ['Likes dark mode.'], entry_count: 1, usage: { text: '1%', percent: 1, current_chars: 16, char_limit: 1375 }, path: '/tmp/USER.md' } }),
          { status: 200 }
        );
      }
      if (url.includes('/api/gui/memory')) {
        return new Response(
          JSON.stringify({ ok: true, memory: { target: 'memory', enabled: true, entries: ['Test memory entry.'], entry_count: 1, usage: { text: '1%', percent: 1, current_chars: 18, char_limit: 2200 }, path: '/tmp/MEMORY.md' } }),
          { status: 200 }
        );
      }
      if (url.includes('/api/gui/session-search')) {
        return new Response(JSON.stringify({ ok: true, results: [] }), { status: 200 });
      }
      if (url.includes('/api/gui/skills')) {
        return new Response(
          JSON.stringify({ ok: true, skills: [{ name: 'writing-plans', description: 'Write plans.', source_type: 'builtin' }] }),
          { status: 200 }
        );
      }
      if (url.includes('/api/gui/cron/jobs')) {
        return new Response(
          JSON.stringify({ ok: true, jobs: [{ job_id: 'cron-1', name: 'Morning summary', schedule: '0 9 * * *', paused: false }] }),
          { status: 200 }
        );
      }
      if (url.includes('/api/gui/chat/backgrounds')) {
        return new Response(
          JSON.stringify({ ok: true, background_runs: [{ run_id: 'run-1', session_id: 'sess-1', status: 'running', prompt: 'Analyze log files', created_at: Date.now() / 1000 }] }),
          { status: 200 }
        );
      }
      if (url.includes('/api/gui/workspace/tree')) {
        return new Response(
          JSON.stringify({
            ok: true,
            tree: {
              name: 'workspace',
              path: '.',
              type: 'directory',
              children: [{ name: 'src/app.py', path: 'src/app.py', type: 'file' }]
            }
          }),
          { status: 200 }
        );
      }
      if (url.includes('/api/gui/workspace/file')) {
        return new Response(JSON.stringify({ ok: true, path: 'src/app.py', content: 'def main():\n    return 1\n' }), { status: 200 });
      }
      if (url.includes('/api/gui/workspace/diff')) {
        return new Response(JSON.stringify({ ok: true, diff: '--- a\n+++ b\n@@\n-old\n+new' }), { status: 200 });
      }
      if (url.includes('/api/gui/workspace/checkpoints')) {
        return new Response(JSON.stringify({ ok: true, checkpoints: [{ checkpoint_id: 'cp-1', label: 'before patch' }] }), { status: 200 });
      }
      if (url.includes('/api/gui/processes')) {
        return new Response(JSON.stringify({ ok: true, processes: [{ process_id: 'proc-1', status: 'running' }] }), { status: 200 });
      }
      if (url.includes('/api/gui/gateway/platforms')) {
        return new Response(
          JSON.stringify({ ok: true, platforms: [{ key: 'telegram', label: 'Telegram', runtime_state: 'connected', enabled: true, configured: true }] }),
          { status: 200 }
        );
      }
      if (url.includes('/api/gui/gateway/pairing')) {
        return new Response(JSON.stringify({ ok: true, pairings: [] }), { status: 200 });
      }
      if (url.includes('/api/gui/gateway/overview')) {
        return new Response(JSON.stringify({ ok: true, overview: { summary: { platform_count: 5, connected_platforms: 2, enabled_platforms: 3 } } }), { status: 200 });
      }
      if (url.includes('/api/gui/settings')) {
        return new Response(
          JSON.stringify({ ok: true, settings: { model: 'hermes-agent', provider: 'openai-codex', browser_mode: 'local', tts_provider: 'edge' } }),
          { status: 200 }
        );
      }
      if (url.includes('/api/gui/logs')) {
        return new Response(JSON.stringify({ ok: true, lines: ['[info] hello', '[info] world'] }), { status: 200 });
      }
      if (url.includes('/api/gui/sessions/') && url.endsWith('/transcript')) {
        return new Response(
          JSON.stringify({ ok: true, items: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'hi' }] }),
          { status: 200 }
        );
      }
      if (url.includes('/api/gui/sessions/')) {
        return new Response(JSON.stringify({ ok: true, session: { title: 'Session One', recap: { preview: 'Loaded from API' } } }), {
          status: 200
        });
      }
      if (url.includes('/api/gui/sessions')) {
        return new Response(
          JSON.stringify({ ok: true, sessions: [{ session_id: 'sess-1', title: 'Session One', source: 'cli', last_active: 123 }] }),
          { status: 200 }
        );
      }
      if (url.includes('/api/gui/commands')) {
        return new Response(JSON.stringify({ ok: true, commands: [
          { name: 'help', description: 'Show available commands', category: 'Info', aliases: [], names: ['help'], args_hint: '', subcommands: [], cli_only: false, gateway_only: false },
          { name: 'model', description: 'Switch model for this session', category: 'Configuration', aliases: [], names: ['model'], args_hint: '[model]', subcommands: [], cli_only: false, gateway_only: false },
          { name: 'queue', description: 'Queue a prompt for the next turn', category: 'Session', aliases: ['q'], names: ['queue', 'q'], args_hint: '<prompt>', subcommands: [], cli_only: false, gateway_only: false }
        ] }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;
  });

  it('renders the primary navigation items', () => {
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /Primary navigation/i });
    for (const item of PRIMARY_NAV_ITEMS) {
      expect(within(nav).getByRole('button', { name: new RegExp(item, 'i') })).toBeInTheDocument();
    }
  });

  it('renders the chat page by default', () => {
    render(<App />);

    expect(screen.getByLabelText('Transcript')).toBeInTheDocument();
    expect(screen.getByLabelText('Composer')).toBeInTheDocument();
  });

  it('switches route content when navigating to Sessions', async () => {
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /Primary navigation/i });
    fireEvent.click(within(nav).getByRole('button', { name: /Sessions/i }));
    
    expect((await screen.findAllByText('Session One')).length).toBeGreaterThan(0);
  });

  it('switches route content when navigating to Workspace', async () => {
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /Primary navigation/i });
    fireEvent.click(within(nav).getByRole('button', { name: /Workspace/i }));
    
    expect(await screen.findByLabelText('File tree')).toBeInTheDocument();
    expect(screen.getByLabelText('Terminal panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Process panel')).toBeInTheDocument();
  });

  it('switches route content when navigating to Memory, Skills, and Automations', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: /Primary navigation/i });

    fireEvent.click(within(nav).getByRole('button', { name: /Memory/i }));
    expect(await screen.findByText('Test memory entry.')).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole('button', { name: /Skills/i }));

    const installedTab = await screen.findByRole('button', { name: /Installed & Local/i });
    fireEvent.click(installedTab);

    expect(await screen.findByText(/writing-plans/i)).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole('button', { name: /Background Jobs/i }));
    expect(await screen.findByText(/Analyze log files/i)).toBeInTheDocument();
  });

  it('switches modal tabs when navigating inside Control Center', async () => {
    render(<App />);

    // Open Control Center first via title
    fireEvent.click(screen.getByTitle('Control Center'));

    // By default Settings form should be visible
    expect(await screen.findByLabelText('Settings form')).toBeInTheDocument();

    // Switch to Gateway tab
    fireEvent.click(screen.getByRole('button', { name: /Messaging Gateway/i }));
    expect(await screen.findByText(/Gateway Platforms/i)).toBeInTheDocument();

    // Switch to Automations tab
    fireEvent.click(screen.getByRole('button', { name: /Automations/i }));
    expect(await screen.findByText(/Morning summary/i)).toBeInTheDocument();
  });

  it('opens SSE after sending a message and receives streaming events into transcript', async () => {
    render(<App />);

    // SSE is not created on mount; it opens after a send that returns a real session id.
    const prompt = screen.getByPlaceholderText(/Message Hermes.../i);
    fireEvent.change(prompt, { target: { value: 'Hello from test' } });
    fireEvent.submit(screen.getByLabelText('Composer'));

    // Wait for send to complete (Hermes is thinking indicator appears after POST resolves)
    await waitFor(() => {
      expect(screen.getByText(/Hermes is thinking/i)).toBeInTheDocument();
    });

    // SSE should now be open
    const es = MockEventSource.lastInstance;
    expect(es).not.toBeNull();
    expect(es!.url).toContain('/api/gui/stream/session/session-live');

    await act(async () => {
      es!.simulateMessage({
        type: 'tool.started',
        session_id: 'session-live',
        run_id: 'run-1',
        payload: { tool_name: 'search_files', preview: 'search_files(pattern=*.py)' },
        ts: Date.now() / 1000
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/search_files\(pattern=\*\.py\)/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tool timeline/i)).toBeInTheDocument();
    });

    await act(async () => {
      es!.simulateMessage({
        type: 'message.assistant.completed',
        session_id: 'session-live',
        run_id: 'run-1',
        payload: { content: 'Hermes completed analysis.' },
        ts: Date.now() / 1000
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Hermes completed analysis/i)).toBeInTheDocument();
    });
  });

  it('toggles the inspector and drawer from the top bar', () => {
    render(<App />);

    const inspector = screen.getByLabelText('Inspector');
    const drawer = screen.getByLabelText('Bottom drawer');

    fireEvent.click(screen.getByTitle('Inspector Panel'));
    expect(inspector.className).toContain('inspector-hidden');

    fireEvent.click(screen.getByTitle('Terminal Drawer'));
    expect(drawer.className).not.toContain('bottom-drawer-hidden');
  });

  it('changes inspector tabs', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'tools' }));
    expect(screen.getByRole('button', { name: 'tools' }).className).toContain('panel-tab-active');
  });

  it('opens the command palette and prefills slash commands into chat', async () => {
    render(<App />);

    fireEvent.click(screen.getByTitle(/Command Palette/i));
    expect(await screen.findByText(/Command Palette/i)).toBeInTheDocument();

    const search = screen.getByPlaceholderText(/Search routes, actions, or commands/i);
    fireEvent.change(search, { target: { value: 'model' } });

    const runModelButton = screen.getAllByRole('button').find((button) => button.textContent?.includes('Run /model'));
    expect(runModelButton).toBeTruthy();
    fireEvent.click(runModelButton as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByLabelText('Composer')).toBeInTheDocument();
      const textarea = document.querySelector('#chat-prompt') as HTMLTextAreaElement | null;
      expect(textarea?.value).toBe('/model ');
    });
  });

  it('can pin actions from the command palette and show them in the pinned section', async () => {
    render(<App />);

    fireEvent.click(screen.getByTitle(/Command Palette/i));
    expect(await screen.findByText(/Command Palette/i)).toBeInTheDocument();

    const openUsageLabel = await screen.findByText(/Open Usage/i);
    const openUsage = openUsageLabel.closest('[role="button"]') as HTMLElement;
    const pinButton = within(openUsage).getByRole('button', { name: /☆ pin/i });
    fireEvent.click(pinButton);

    fireEvent.click(screen.getAllByRole('button', { name: '✕' })[0]);
    fireEvent.click(screen.getByTitle(/Command Palette/i));

    expect(await screen.findByText('Pinned')).toBeInTheDocument();
    const pinnedHeading = screen.getByText('Pinned');
    const pinnedSection = pinnedHeading.parentElement as HTMLElement;
    expect(within(pinnedSection).getByText(/Open Usage/i)).toBeInTheDocument();
  });
});
