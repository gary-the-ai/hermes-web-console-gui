import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../lib/api';
import { openSessionEventStream, type GuiEvent } from '../lib/events';
import { ApprovalPrompt } from '../components/chat/ApprovalPrompt';
import { ClarifyPrompt } from '../components/chat/ClarifyPrompt';
import { Composer, type AttachedFile } from '../components/chat/Composer';
import { RunStatusBar } from '../components/chat/RunStatusBar';
import { ToolTimeline } from '../components/chat/ToolTimeline';
import { Transcript, type TranscriptItem } from '../components/chat/Transcript';
import { UsageBar } from '../components/chat/UsageBar';
import { SessionSidebar } from '../components/chat/SessionSidebar';

interface HumanRequest {
  id: string;
  kind: 'approval' | 'clarify';
  command?: string;
  message?: string;
  expires_at?: number;
}

interface HumanPendingResponse {
  ok: boolean;
  pending: HumanRequest[];
}

interface ChatSendResponse {
  ok: boolean;
  session_id: string;
  run_id: string;
  status: string;
}

const DEFAULT_ITEMS: TranscriptItem[] = [];

function mapGuiEventToTranscriptItem(event: GuiEvent): TranscriptItem | null {
  const { type, payload } = event;

  if (type === 'tool.started') {
    const name = String(payload.tool_name ?? 'tool');
    const preview = String(payload.preview ?? '');
    return { role: 'tool', title: name, content: preview ? `started · ${preview}` : 'started' };
  }

  if (type === 'tool.completed') {
    const name = String(payload.tool_name ?? 'tool');
    const duration = payload.duration != null ? String(payload.duration) : '';
    const preview = String(payload.result_preview ?? '');
    const parts = [duration ? `completed in ${duration}` : 'completed', preview].filter(Boolean);
    return { role: 'tool', title: name, content: parts.join(' · ') };
  }

  if (type === 'run.failed') {
    const error = String(payload.error ?? payload.error_type ?? 'Run failed');
    return { role: 'system', title: 'Run failed', content: error };
  }

  if (type === 'run.started' || type === 'run.completed' || type === 'message.user' || type === 'message.assistant.completed' || type === 'message.assistant.delta') {
    // Handled specifically in subscribeToEvents or ignored
    return null;
  }

  return null;
}

export function ChatPage({ voiceMode }: { voiceMode?: boolean }) {
  const [items, setItems] = useState<TranscriptItem[]>(DEFAULT_ITEMS);
  const [runStatus, setRunStatus] = useState('connecting');
  const [sessionId, setSessionId] = useState('current');
  const [humanPending, setHumanPending] = useState<HumanRequest[]>([]);
  const [toolEvents, setToolEvents] = useState<string[]>([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<Record<string, any>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reasoningEffort, setReasoningEffort] = useState<string>('none');
  const subscriptionRef = useRef<{ close(): void } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceModeRef = useRef(voiceMode);

  // Sync voiceMode prop to ref for event callbacks
  useEffect(() => {
    voiceModeRef.current = voiceMode;
    if (!voiceMode && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [voiceMode]);

  // Sync state with Inspector Panels
  useEffect(() => {
    const handleRequest = () => {
      window.dispatchEvent(new CustomEvent('hermes-run-sync', {
        detail: { runId: currentRunId, status: runStatus }
      }));
      window.dispatchEvent(new CustomEvent('hermes-session-sync', {
        detail: { sessionId }
      }));
    };
    window.addEventListener('hermes-run-request-sync', handleRequest);
    handleRequest(); // Initial broadcast
    return () => window.removeEventListener('hermes-run-request-sync', handleRequest);
  }, [currentRunId, runStatus, sessionId]);

  const subscribeToEvents = (sid: string) => {
    if (subscriptionRef.current) {
      subscriptionRef.current.close();
    }

    setToolEvents(['run.started', 'message.user', 'tool.started', 'tool.completed', 'message.assistant.completed']);

    subscriptionRef.current = openSessionEventStream(sid, (event) => {
      const mapped = mapGuiEventToTranscriptItem(event);
      if (mapped) {
        setItems((prev) => [...prev, mapped]);
      }

      if (event.type === 'message.assistant.delta') {
        const text = String(event.payload.content || '');
        if (text) {
          setItems((prev) => {
            const next = [...prev];
            const thinkingIdx = next.findIndex(i => i.content === '⏳ Hermes is thinking…');
            if (thinkingIdx >= 0) next.splice(thinkingIdx, 1);
            
            let lastAssistantIdx = -1;
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].role === 'assistant') {
                lastAssistantIdx = i;
                break;
              }
            }
            if (lastAssistantIdx >= 0) {
              next[lastAssistantIdx] = { ...next[lastAssistantIdx], content: next[lastAssistantIdx].content + text, isStreaming: true };
            } else {
              next.push({ role: 'assistant', title: 'Hermes', content: text, isStreaming: true });
            }
            return next;
          });
        }
      } else if (event.type === 'message.assistant.completed') {
        const text = String(event.payload.content || '');
        setItems((prev) => {
          const next = [...prev];
          const thinkingIdx = next.findIndex(i => i.content === '⏳ Hermes is thinking…');
          if (thinkingIdx >= 0) next.splice(thinkingIdx, 1);
          
          let lastAssistantIdx = -1;
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === 'assistant') {
              lastAssistantIdx = i;
              break;
            }
          }
          if (lastAssistantIdx >= 0) {
            next[lastAssistantIdx] = { ...next[lastAssistantIdx], content: text, isStreaming: false };
          } else {
            next.push({ role: 'assistant', title: 'Hermes', content: text || '(no response text)', isStreaming: false });
          }
          return next;
        });

        if (voiceModeRef.current && text && window.speechSynthesis) {
          // Cancel any ongoing speech
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text.slice(0, 1000)); // Speak up to 1000 chars to avoid memory issues
          window.speechSynthesis.speak(utterance);
        }
      }

      if (event.type === 'tool.started') {
        const name = String(event.payload.tool_name ?? 'tool');
        setToolEvents((prev) => {
          const entry = `tool.started · ${name}`;
          return prev.includes(entry) ? prev : [...prev, entry];
        });
      } else if (event.type === 'tool.completed') {
        const name = String(event.payload.tool_name ?? 'tool');
        setToolEvents((prev) => {
          const entry = `tool.completed · ${name}`;
          return prev.includes(entry) ? prev : [...prev, entry];
        });
      } else if (event.type === 'run.completed') {
        setRunStatus('completed');
        if (event.payload.usage) {
          setUsageData((prev) => {
            const next = { ...prev };
            const usage = event.payload.usage as any;
            next.prompt_tokens = (next.prompt_tokens || 0) + (usage?.prompt_tokens || 0);
            next.completion_tokens = (next.completion_tokens || 0) + (usage?.completion_tokens || 0);
            next.total_tokens = (next.total_tokens || 0) + (usage?.total_tokens || 0);
            return next;
          });
        }
        // Remove the "thinking" indicator
        setItems((prev) => {
          let idx = -1;
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].content === '⏳ Hermes is thinking…') { idx = i; break; }
          }
          if (idx >= 0) {
            const next = [...prev];
            next.splice(idx, 1);
            return next;
          }
          return prev;
        });
      } else if (event.type === 'run.failed') {
        setRunStatus('failed');
        // Remove the "thinking" indicator on failure too
        setItems((prev) => {
          let idx = -1;
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].content === '⏳ Hermes is thinking…') { idx = i; break; }
          }
          if (idx >= 0) {
            const next = [...prev];
            next.splice(idx, 1);
            return next;
          }
          return prev;
        });
      }
    });
  };

  const loadSession = async (sid: string) => {
    if (subscriptionRef.current) {
      subscriptionRef.current.close();
    }
    // Update hash for deep linking
    window.location.hash = `#/chat/${sid}`;
    
    setSessionId(sid);
    setRunStatus('completed');
    setCurrentRunId(null);
    setToolEvents([]);
    setUsageData({});
    try {
      const res = await apiClient.get<any>(`/sessions/${sid}/transcript`);
      if (res.ok && Array.isArray(res.transcript)) {
        const mappedItems: TranscriptItem[] = [];
        let curUsage: Record<string, any> | undefined;
        for (const item of res.transcript) {
          if (item.type === 'human') {
            mappedItems.push({ role: 'user', title: 'You', content: item.content || '' });
          } else if (item.type === 'assistant') {
            mappedItems.push({ role: 'assistant', title: 'Hermes', content: item.content || '' });
          } else if (item.type === 'run') {
            if (item.usage) curUsage = item.usage;
          }
        }
        setItems(mappedItems.length > 0 ? mappedItems : [{ role: 'system', title: 'System', content: 'Session loaded.' }]);
        if (curUsage) setUsageData(curUsage);
      }
    } catch (err) {
      console.error('Failed to load transcript:', err);
    }
    subscribeToEvents(sid);
  };

  const refreshPending = (active = true) => {
    apiClient
      .get<HumanPendingResponse>('/human/pending')
      .then((response) => {
        if (active && response.ok) {
          setHumanPending(response.pending);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    let active = true;

    // Check backend connectivity
    apiClient
      .get<{ status: string }>('/health')
      .then(() => {
        if (active) {
          setBackendConnected(true);
          setRunStatus('ready');
          setItems([{ role: 'system', title: 'System', content: '✓ Connected to Hermes backend. Send a message to start chatting.' }]);
        }
      })
      .catch(() => {
        if (active) {
          setBackendConnected(false);
          setRunStatus('disconnected');
          setItems([{ role: 'system', title: 'System', content: '✗ Cannot reach Hermes backend. Make sure the gateway is running (API_SERVER_ENABLED=true python -m gateway.run).' }]);
        }
      });

    refreshPending(active);

    // Poll for pending human requests every 3 seconds
    const pollId = setInterval(() => {
      if (active) refreshPending(active);
    }, 3000);

    // Check URL hash for deep linking (e.g. #/chat/session-xyz)
    const hashParts = window.location.hash.replace('#/', '').split('/');
    if (hashParts[0] === 'chat' && hashParts[1]) {
      loadSession(hashParts[1]);
    }

    return () => {
      active = false;
      clearInterval(pollId);
      if (subscriptionRef.current) {
        subscriptionRef.current.close();
      }
    };
  }, []);

  // Auto-scroll on new messages and during streaming content updates
  const lastItemContent = items.length > 0 ? items[items.length - 1].content : '';
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length, lastItemContent]);

  useEffect(() => {
    if (sessionId && sessionId !== 'current') {
      subscribeToEvents(sessionId);
    }
  }, [sessionId]);

  const approvals = humanPending.filter((item) => item.kind === 'approval');
  const clarifications = humanPending.filter((item) => item.kind === 'clarify');

  const handleApprove = async (id: string, decision: 'once' | 'session' | 'always') => {
    await apiClient.post('/human/approve', { request_id: id, decision });
    refreshPending(true);
  };

  const handleDeny = async (id: string) => {
    await apiClient.post('/human/deny', { request_id: id });
    refreshPending(true);
  };

  const handleClarify = async (id: string, response: string) => {
    await apiClient.post('/human/clarify', { request_id: id, response });
    refreshPending(true);
  };

  const handleSend = async (prompt: string, attachments: AttachedFile[] = [], isBackground?: boolean, isQuickAsk?: boolean) => {
    setItems((prev) => [...prev, { role: 'user', title: isQuickAsk ? 'You (Quick Ask)' : 'You', content: prompt + (attachments.length ? ` [${attachments.length} file(s) attached]` : '') }]);
    setRunStatus('sending…');

    // Upload attachments first
    const uploadedPaths: string[] = [];
    const transcriptions: string[] = [];
    const audioExts = ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac', '.flac'];

    for (const att of attachments) {
      try {
        const result = await apiClient.upload<{ ok: boolean; media: { file_path: string } }>('/media/upload', att.file);
        if (result.ok) {
          uploadedPaths.push(result.media.file_path);

          // Auto-transcribe audio files
          const lowerName = att.file.name.toLowerCase();
          if (audioExts.some((ext) => lowerName.endsWith(ext))) {
            try {
              const txRes = await apiClient.post<{ ok: boolean; transcription?: { text?: string } }>('/media/transcribe', { file_path: result.media.file_path });
              if (txRes.ok && txRes.transcription?.text) {
                transcriptions.push(txRes.transcription.text);
              }
            } catch { /* transcription optional */ }
          }
        }
      } catch {
        // Upload failed, skip this attachment
      }
    }

    // Enrich prompt with file paths and transcriptions
    let enrichedPrompt = prompt;
    if (uploadedPaths.length > 0) {
      enrichedPrompt = `${prompt}\n\n[Attached files: ${uploadedPaths.join(', ')}]`;
    }
    if (transcriptions.length > 0) {
      enrichedPrompt += `\n\n[Audio transcription: ${transcriptions.join(' | ')}]`;
    }

    const sid = sessionId === 'current' ? `session-${Date.now()}` : sessionId;
    if (sessionId === 'current' && !isBackground && !isQuickAsk) {
      setSessionId(sid);
      subscribeToEvents(sid);
    } else if (sessionId === 'current' && isQuickAsk) {
      // Must subscribe to receive quick ask ephemeral stream
      setSessionId(sid);
      subscribeToEvents(sid);
    }

    try {
      let endpoint = '/chat/send';
      if (isQuickAsk) endpoint = '/chat/btw';
      else if (isBackground) endpoint = '/chat/background';

      const response = await apiClient.post<ChatSendResponse>(endpoint, {
        session_id: isBackground ? undefined : sid,
        prompt: enrichedPrompt
      });
      
      if (!isBackground) {
        setSessionId(response.session_id);
        setCurrentRunId(response.run_id);
        setRunStatus('running');
        setToolEvents((prev) => [...prev, `run started · ${response.run_id.slice(0, 8)}`]);
        setItems((prev) => [...prev, { role: 'system', title: 'System', content: isQuickAsk ? '⚡ Hermes is answering…' : '⏳ Hermes is thinking…' }]);
      } else {
        setItems((prev) => [...prev, { role: 'system', title: 'Background Run', content: `✓ Task silently dispatched to background session (${response.session_id.substring(0, 8)}).` }]);
        setRunStatus('ready');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setItems((prev) => [
        ...prev,
        {
          role: 'system',
          title: 'Error',
          content: `Failed to send message: ${msg}`
        }
      ]);
      setRunStatus('error');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {sidebarOpen && (
        <SessionSidebar 
           activeSessionId={sessionId === 'current' ? null : sessionId}
           onSelectSession={loadSession}
           onNewChat={() => {
             if (subscriptionRef.current) subscriptionRef.current.close();
             window.location.hash = '#/chat';
             setSessionId('current');
             setItems([{ role: 'system', title: 'System', content: '✓ Ready. Send a message to start a new chat.' }]);
             setRunStatus('ready');
             setCurrentRunId(null);
             setToolEvents([]);
             setUsageData({});
           }}
        />
      )}
      <div className="chat-layout" style={{ flex: 1, position: 'relative' }}>
        {/* Toggle button on top-left of chat layout */}
        <button 
           onClick={() => setSidebarOpen(!sidebarOpen)} 
           style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '1rem', zIndex: 10, padding: '4px 8px', borderRadius: '4px' }}
           title="Toggle Sidebar"
        >
           ☰
        </button>
        <div className="chat-main-column" style={{ paddingLeft: '48px' }}>
          <Transcript items={items} />
          <div ref={scrollRef} />

        {/* Action Prompts (only visible when pending) */}
        {approvals.length > 0 && <ApprovalPrompt pending={approvals} onApprove={handleApprove} onDeny={handleDeny} />}
        {clarifications.length > 0 && <ClarifyPrompt pending={clarifications} onClarify={handleClarify} onDeny={handleDeny} />}

        {/* Chat Flow Controls */}
        <div style={{ display: 'flex', gap: '8px', padding: '0 20px', justifyContent: 'center' }}>
          {runStatus === 'running' && (
            <button
              type="button"
              onClick={async () => {
                if (!currentRunId) return;
                try {
                  await apiClient.post('/chat/stop', { run_id: currentRunId });
                  setRunStatus('stopped');
                  setItems((prev) => [...prev, { role: 'system', title: 'System', content: '⏹ Stop requested.' }]);
                } catch { /* ignore */ }
              }}
              style={{ padding: '6px 16px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ⏹ Stop
            </button>
          )}
          {(runStatus === 'failed' || runStatus === 'completed') && currentRunId && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await apiClient.post<ChatSendResponse>('/chat/retry', { run_id: currentRunId });
                  setCurrentRunId(res.run_id);
                  setRunStatus('running');
                  setItems((prev) => [...prev, { role: 'system', title: 'System', content: '🔄 Retrying…' }]);
                } catch { /* ignore */ }
              }}
              style={{ padding: '6px 16px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#7dd3fc', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              🔄 Retry
            </button>
          )}
          {items.length > 1 && (runStatus === 'completed' || runStatus === 'ready') && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await apiClient.post('/chat/undo', { session_id: sessionId, run_id: currentRunId });
                  setItems((prev) => prev.slice(0, -1));
                } catch { /* ignore */ }
              }}
              style={{ padding: '6px 16px', borderRadius: '20px', background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fde68a', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ↩ Undo
            </button>
          )}
          {items.length > 5 && sessionId !== 'current' && (runStatus === 'completed' || runStatus === 'ready') && (
            <button
              type="button"
              onClick={async () => {
                setItems((prev) => [...prev, { role: 'system', title: 'System', content: '🗜️ Compressing context...' }]);
                try {
                  const res = await apiClient.post<{ok: boolean, compressed: boolean, reason?: string, original_length?: number, new_length?: number}>('/chat/compress', { session_id: sessionId });
                  if (res.compressed) {
                    await loadSession(sessionId);
                    setItems((prev) => [...prev, { role: 'system', title: 'System', content: `✓ Context compressed from ${res.original_length} to ${res.new_length} messages.` }]);
                  } else {
                    setItems((prev) => [...prev, { role: 'system', title: 'System', content: `ℹ️ Compression skipped: ${res.reason}` }]);
                  }
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    setItems((prev) => [...prev, { role: 'system', title: 'Error', content: `Failed to compress: ${msg}` }]);
                }
              }}
              style={{ padding: '6px 16px', borderRadius: '20px', background: 'rgba(74, 222, 128, 0.15)', border: '1px solid rgba(74, 222, 128, 0.3)', color: '#4ade80', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              🗜️ Compress
            </button>
          )}
        </div>

        <Composer onSend={handleSend} onNewChat={() => {
          if (subscriptionRef.current) subscriptionRef.current.close();
          window.location.hash = '#/chat';
          setSessionId('current');
          setItems([{ role: 'system', title: 'System', content: '✓ Ready. Send a message to start a new chat.' }]);
          setRunStatus('ready');
          setCurrentRunId(null);
          setToolEvents([]);
          setUsageData({});
        }}
        reasoningEffort={reasoningEffort}
        onReasoningChange={(val) => {
          setReasoningEffort(val);
          apiClient.patch('/settings', { agent: { reasoning_effort: val } }).catch(() => {});
        }}
        />
        <UsageBar usage={usageData} />
      </div>
    </div>
    </div>
  );
}
