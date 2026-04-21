import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIPanelProps {
  articleId: string;
  articleTitle: string;
}

export function AiPanel({ articleId, articleTitle }: AIPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      // Call API with message history and article context
      const response = await fetch('http://localhost:8005/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sentient_token') || ''}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an AI research assistant analyzing the article "${articleTitle}". Help the user investigate claims, find connections, and evaluate evidence. You have access to the full Sentient graph database. Provide clear, concise analysis focused on the article's claims, evidence, and related investigations.`,
            },
            ...messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: 'user',
              content: userMessage,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'API error' }));
        throw new Error(error.message || 'Failed to get response');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || data.message || 'No response',
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMsg);
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      claims: `Please analyze the key claims in this article. What are the main assertions, and how well are they supported?`,
      connections: `What connections and relationships exist in the knowledge graph for this article? Show me the network of related nodes.`,
      evidence: `Evaluate the evidence and sources supporting this article. Are there challenges or counter-evidence I should know about?`,
    };
    sendMessage(prompts[action]);
  };

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-crt-fg text-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-40 font-mono font-bold text-lg"
          title="Open AI Research Assistant"
        >
          ◆
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 top-0 w-[400px] bg-black border-l border-crt-border flex flex-col shadow-xl font-mono z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-crt-border">
            <h3 className="text-lg font-bold text-crt-fg">AI Research Assistant</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-crt-muted hover:text-crt-fg transition-colors font-bold text-xl"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <p className="text-crt-muted text-sm mb-4">
                  Ask me about claims, evidence, connections, and more.
                </p>
                <div className="space-y-2 w-full px-2">
                  <button
                    onClick={() => handleQuickAction('claims')}
                    className="w-full px-3 py-2 text-xs bg-crt-border text-crt-fg hover:bg-crt-fg hover:text-black transition-colors rounded"
                  >
                    Analyze Claims
                  </button>
                  <button
                    onClick={() => handleQuickAction('connections')}
                    className="w-full px-3 py-2 text-xs bg-crt-border text-crt-fg hover:bg-crt-fg hover:text-black transition-colors rounded"
                  >
                    Find Connections
                  </button>
                  <button
                    onClick={() => handleQuickAction('evidence')}
                    className="w-full px-3 py-2 text-xs bg-crt-border text-crt-fg hover:bg-crt-fg hover:text-black transition-colors rounded"
                  >
                    Evaluate Evidence
                  </button>
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs px-3 py-2 rounded text-sm ${
                    msg.role === 'user'
                      ? 'bg-crt-border text-crt-fg'
                      : 'bg-black border border-crt-border text-crt-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-black border border-crt-border px-3 py-2 rounded">
                  <p className="text-crt-muted text-sm">Thinking...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="bg-black border border-crt-error px-3 py-2 rounded">
                  <p className="text-crt-error text-sm">{error}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length > 0 && (
            <div className="px-3 py-3 border-t border-crt-border bg-black space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleQuickAction('claims')}
                  disabled={loading}
                  className="px-2 py-1 text-xs bg-crt-border text-crt-fg hover:bg-crt-fg hover:text-black transition-colors rounded disabled:opacity-50"
                >
                  Claims
                </button>
                <button
                  onClick={() => handleQuickAction('connections')}
                  disabled={loading}
                  className="px-2 py-1 text-xs bg-crt-border text-crt-fg hover:bg-crt-fg hover:text-black transition-colors rounded disabled:opacity-50"
                >
                  Connections
                </button>
                <button
                  onClick={() => handleQuickAction('evidence')}
                  disabled={loading}
                  className="px-2 py-1 text-xs bg-crt-border text-crt-fg hover:bg-crt-fg hover:text-black transition-colors rounded disabled:opacity-50"
                >
                  Evidence
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-crt-border bg-black">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    sendMessage(input);
                  }
                }}
                disabled={loading}
                placeholder="Ask something..."
                className="flex-1 px-3 py-2 bg-black border border-crt-border text-crt-fg text-sm focus:outline-none focus:border-crt-fg placeholder-crt-muted disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="px-4 py-2 bg-crt-fg text-black font-bold hover:bg-white transition-colors disabled:opacity-50 rounded"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
