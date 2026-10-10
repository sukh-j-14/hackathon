import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  type FormEvent,
} from 'react';
import { MessageCircle, Send, RotateCcw, X } from 'lucide-react';
import { api, type Answer } from '../api';
import { Assistant } from './Features';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  answer?: Answer;
};

export function Chatbot({
  messages,
  setMessages,
  storeId,
  category,
  customer,
  support,
  run,
  busy,
  openAction,
}: {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  storeId: string;
  category: string;
  customer: boolean;
  support: () => void;
  run: (task: () => Promise<void>) => Promise<void>;
  busy: boolean;
  openAction: (panel: 'orders' | 'support' | 'operations' | 'knowledge' | 'admin') => void;
}) {
  const [actions, setActions] = useState<
    {
      id: string;
      label: string;
      description: string;
      panel: 'orders' | 'support' | 'operations' | 'knowledge' | 'admin';
    }[]
  >([]);
  const [mode, setMode] = useState('policy');
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [excerpt, setExcerpt] = useState<{ title: string; content: string } | null>(null);
  const [policyCategory, setPolicyCategory] = useState(category);
  const end = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    api<typeof actions>('/assistant/actions', { signal: controller.signal })
      .then(setActions)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, pending]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = question.trim();
    if (text.length < 3 || pending) return;
    setPending(true);
    setError('');
    setExcerpt(null);
    setQuestion('');
    const controller = new AbortController();
    request.current = controller;
    // Keep conversation in this signed-in page only. The server bounds and validates context again.
    const history = messages
      .slice(-8)
      .map(({ role, content }) => ({ role, content: content.slice(0, 4000) }));
    const id = crypto.randomUUID();
    setMessages((previous) => [...previous, { id, role: 'user', content: text }]);
    try {
      const answer = await api<Answer>('/assistant/ask', {
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify({
          question: text,
          history,
          category: policyCategory || undefined,
          documentType: 'POLICY',
        }),
      });
      if (!controller.signal.aborted)
        setMessages((previous) => [
          ...previous,
          { id: crypto.randomUUID(), role: 'assistant', content: answer.answer, answer },
        ]);
    } catch (e) {
      if (!controller.signal.aborted) {
        setMessages((previous) => previous.filter((message) => message.id !== id));
        setQuestion(text);
        setError(e instanceof Error ? e.message : 'Could not send your message. Please retry.');
      }
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }
  async function showSource(source: Answer['sources'][number]) {
    try {
      setError('');
      const result = await api<{ content: string }>(`/knowledge/sources/${source.chunkId}`);
      setExcerpt({
        title: `${source.document} · ${source.section} · ${source.version}`,
        content: result.content,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Source is unavailable.');
    }
  }
  return (
    <div className="stack chatbot">
      <div className="chat-actions" aria-label="Approved actions">
        <small>Approved actions · changes are reviewed in their forms</small>
        <div className="inline-actions">
          {actions.map((action) => (
            <button
              disabled={pending}
              key={action.id}
              title={action.description}
              onClick={() => openAction(action.panel)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
      <div className="category-tabs" aria-label="Chatbot tools">
        <button
          disabled={pending}
          className={mode === 'policy' ? 'selected' : ''}
          onClick={() => setMode('policy')}
        >
          Policy chat
        </button>
        {customer && (
          <button
            disabled={pending}
            className={mode === 'products' ? 'selected' : ''}
            onClick={() => setMode('products')}
          >
            Find products
          </button>
        )}
      </div>
      {mode === 'products' ? (
        <Assistant
          productsOnly
          storeId={storeId}
          category={category}
          customer={customer}
          run={run}
          busy={busy}
        />
      ) : (
        <>
          <div className="chat-toolbar">
            <label>
              Policy category
              <select
                disabled={pending}
                value={policyCategory}
                onChange={(e) => {
                  setPolicyCategory(e.target.value);
                  setMessages([]);
                  setExcerpt(null);
                }}
              >
                <option value="">All categories</option>
                {['Audio', 'Computers', 'Wearables', 'Mobiles', 'Home'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <button
              className="text-button"
              disabled={pending || !messages.length}
              onClick={() => {
                setMessages([]);
                setExcerpt(null);
                setError('');
              }}
            >
              <RotateCcw size={14} /> New chat
            </button>
          </div>
          <div
            className="chat-transcript"
            role="log"
            aria-label="Policy conversation"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {!messages.length && (
              <div className="chat-welcome">
                <MessageCircle size={28} />
                <h3>Hi, how can I help?</h3>
                <p>
                  Ask about delivery, membership, returns or warranty. I use approved RetailPulse
                  policies and show the sources.
                </p>
                {[
                  'What are the delivery charges for my membership?',
                  'Can I return an opened mobile phone?',
                  'How do I cancel an order?',
                ].map((text) => (
                  <button key={text} onClick={() => setQuestion(text)}>
                    {text}
                  </button>
                ))}
              </div>
            )}
            {messages.map((message) => (
              <article
                key={message.id}
                className={`chat-message ${message.role}`}
                aria-label={message.role === 'user' ? 'You' : 'RetailPulse chatbot'}
              >
                <small>{message.role === 'user' ? 'You' : 'RetailPulse'}</small>
                <p>{message.content}</p>
                {message.answer && (
                  <>
                    {message.answer.sources.length > 0 && (
                      <div className="chat-sources" aria-label="Policy sources">
                        {message.answer.sources.map((source) => (
                          <button key={source.chunkId} onClick={() => void showSource(source)}>
                            {source.document} · {source.section} · {source.version}
                          </button>
                        ))}
                      </div>
                    )}
                    {message.answer.mode.endsWith('_EXCERPTS') && (
                      <small>Policy excerpts · generated answers are not configured</small>
                    )}
                    {message.answer.followUpRequired && (
                      <button className="text-button" onClick={support}>
                        Contact support
                      </button>
                    )}
                  </>
                )}
              </article>
            ))}
            {pending && (
              <p role="status" className="chat-thinking">
                Checking approved policies…
              </p>
            )}
            <div ref={end} />
          </div>
          {error && (
            <p role="alert" className="chat-error">
              {error}
            </p>
          )}
          {excerpt && (
            <aside className="chat-excerpt">
              <button
                className="icon-button"
                aria-label="Close policy source"
                onClick={() => setExcerpt(null)}
              >
                <X size={16} />
              </button>
              <strong>{excerpt.title}</strong>
              <p>{excerpt.content}</p>
            </aside>
          )}
          <form className="chat-composer" onSubmit={(e) => void send(e)}>
            <label>
              Message
              <textarea
                required
                minLength={3}
                maxLength={1000}
                rows={2}
                disabled={pending}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a policy question or a follow-up…"
              />
            </label>
            <button
              className="button dark"
              disabled={pending || question.trim().length < 3}
              type="submit"
            >
              <Send size={16} /> Send message
            </button>
          </form>
          <small>
            Answers use active policies applicable to your membership. No order or payment actions
            are performed in chat.
          </small>
        </>
      )}
    </div>
  );
}
