import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
      if (url.includes('/api/gui/memory')) {
        return new Response(
          JSON.stringify({ ok: true, entries: [{ target: 'memory', content: 'Test memory entry.' }] }),
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
          JSON.stringify({ ok: true, platforms: [{ platform: 'telegram', connected: true, enabled: true, configured: true, error: null }] }),
          { status: 200 }
        );
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
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;
  });

  it('renders the primary navigation items', () => {
    render(<App />);

    for (const item of PRIMARY_NAV_ITEMS) {
      expect(screen.getByRole('button', { name: item })).toBeInTheDocument();
    }
  });

  it('renders the chat page by default', () => {
    render(<App />);

    expect(screen.getByText('Transcript')).toBeInTheDocument();
    expect(screen.getByLabelText('Composer')).toBeInTheDocument();
    expect(screen.getByLabelText('Tool timeline')).toBeInTheDocument();
    expect(screen.getByLabelText('Approval prompt')).toBeInTheDocument();
    expect(screen.getByLabelText('Clarification prompt')).toBeInTheDocument();
  });

  it('switches route content when navigating to Sessions', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }));
    expect(await screen.findByText('Session One')).toBeInTheDocument();
    expect(screen.getByLabelText('Session list')).toBeInTheDocument();
    expect(screen.getByLabelText('Session preview')).toBeInTheDocument();
  });

  it('switches route content when navigating to Workspace', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Workspace' }));
    expect(await screen.findByLabelText('File tree')).toBeInTheDocument();
    expect(screen.getByLabelText('File viewer')).toBeInTheDocument();
    expect(screen.getByLabelText('Diff viewer')).toBeInTheDocument();
    expect(screen.getByLabelText('Checkpoint list')).toBeInTheDocument();
    expect(screen.getByLabelText('Terminal panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Process panel')).toBeInTheDocument();
  });

  it('switches route content when navigating to Memory, Skills, and Automations', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Memory' }));
    expect(await screen.findByText('Test memory entry.')).toBeInTheDocument();
    expect(screen.getByLabelText('Memory')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Skills' }));
    expect(await screen.findByText('writing-plans')).toBeInTheDocument();
    expect(screen.getByLabelText('Skills')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Automations' }));
    expect(await screen.findByText('Morning summary')).toBeInTheDocument();
    expect(screen.getByLabelText('Automations list')).toBeInTheDocument();
  });

  it('switches route content when navigating to Gateway, Settings, and Logs', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Gateway' }));
    expect(await screen.findByText('telegram')).toBeInTheDocument();
    expect(screen.getByLabelText('Gateway platforms')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByLabelText('Settings form')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Logs' }));
    expect(await screen.findByText('[info] hello')).toBeInTheDocument();
    expect(screen.getByLabelText('Log viewer')).toBeInTheDocument();
  });

  it('opens SSE after sending a message and receives streaming events into transcript', async () => {
    render(<App />);

    // SSE is not created on mount; it opens after a send that returns a real session id.
    const prompt = screen.getByLabelText('Prompt');
    fireEvent.change(prompt, { target: { value: 'Hello from test' } });
    fireEvent.submit(screen.getByLabelText('Composer'));

    // Wait for send to complete
    await waitFor(() => {
      expect(screen.getByText(/Hello from test/)).toBeInTheDocument();
    });

    // SSE should now be open
    const es = MockEventSource.lastInstance;
    expect(es).not.toBeNull();
    expect(es!.url).toContain('/api/gui/stream/session/session-live');

    es!.simulateMessage({
      type: 'tool.started',
      session_id: 'session-live',
      run_id: 'run-1',
      payload: { tool_name: 'search_files', preview: 'search_files(pattern=*.py)' },
      ts: Date.now() / 1000
    });

    await waitFor(() => {
      expect(screen.getByText(/search_files.*started/)).toBeInTheDocument();
    });

    es!.simulateMessage({
      type: 'message.assistant.completed',
      session_id: 'session-live',
      run_id: 'run-1',
      payload: { content: 'Hermes completed analysis.' },
      ts: Date.now() / 1000
    });

    await waitFor(() => {
      expect(screen.getByText('Hermes completed analysis.')).toBeInTheDocument();
    });
  });

  it('toggles the inspector and drawer from the top bar', () => {
    render(<App />);

    const inspector = screen.getByLabelText('Inspector');
    const drawer = screen.getByLabelText('Bottom drawer');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle inspector' }));
    expect(inspector.className).toContain('inspector-hidden');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle drawer' }));
    expect(drawer.className).not.toContain('bottom-drawer-hidden');
  });

  it('changes inspector tabs', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'tools' }));
    expect(screen.getByText('Inspector scaffold for tools details.')).toBeInTheDocument();
  });
});
