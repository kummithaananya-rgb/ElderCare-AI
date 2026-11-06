import React, { useState, useEffect, useRef } from 'react';

const GREET = {
  id: 0, from: 'bot',
  text: "Hello! 👋 I'm your ElderCare AI companion powered by Meta Llama 3.3 70B via IBM watsonx.ai. I'm here to help you with health tips, reminders, and friendly conversation. What can I help you with today?",
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

// Safely detect Speech APIs (may be undefined in some environments)
const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
  : null;
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

export default function AIAssistant() {
  const [messages, setMessages] = useState([GREET]);
  const [input, setInput]       = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const recognizerRef = useRef(null);
  const bottomRef     = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build the history array from the current messages state.
  // Excludes the greeting (id === 0) and in-flight loading placeholders.
  // Keeps only the last 20 messages (10 turns) to stay within payload limits.
  const buildHistory = (msgs) =>
    msgs
      .filter(m => m.id !== 0 && !m.loading)
      .slice(-20)
      .map(m => ({
        role: m.from === 'bot' ? 'assistant' : 'user',
        content: m.text,
      }));

  const speak = (text) => {
    if (!synth) return;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''));
    utter.rate = 0.88;
    utter.pitch = 1;
    utter.onstart = () => setSpeaking(true);
    utter.onend   = () => setSpeaking(false);
    synth.speak(utter);
  };

  // Performs the actual fetch to the backend and updates message state.
  // `thinkingId` identifies the loading-placeholder message to replace.
  const fetchReply = async (userText, history, thinkingId) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history }),
      });

      let reply;
      if (res.ok) {
        const data = await res.json();
        reply = data.reply && data.reply.trim()
          ? data.reply
          : '🤔 I received an empty response. Please try again.';
      } else {
        // Backend returned an error status — show only a generic message.
        reply = '⚠️ The AI assistant is temporarily unavailable. Please try again in a moment.';
      }

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== thinkingId);
        return [
          ...filtered,
          {
            id: Date.now(),
            from: 'bot',
            text: reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ];
      });
      speak(reply);

    } catch {
      // Network error — backend not running or unreachable.
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== thinkingId);
        return [
          ...filtered,
          {
            id: Date.now(),
            from: 'bot',
            text: '⚠️ Could not reach the AI assistant. Please check that the backend server is running on port 8000.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  // Main send handler — captures history from current state, adds user message
  // and a "Thinking…" placeholder, then fires the backend fetch.
  const sendMessage = (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput('');

    // Compute history and IDs from current messages state BEFORE calling
    // setMessages, so the updater is a pure function with no side-effects.
    // React 18 Strict Mode double-invokes updater functions to detect impurity;
    // putting fetchReply inside the updater causes a double API call.
    const history    = buildHistory(messages);
    const now        = Date.now();
    const thinkingId = now + 1;

    setMessages(prev => [
      ...prev,
      {
        id: now,
        from: 'user',
        text: trimmed,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      {
        id: thinkingId,
        from: 'bot',
        text: '⏳ Thinking…',
        time: '',
        loading: true,
      },
    ]);

    fetchReply(trimmed, history, thinkingId);
  };

  const handleKey = e => { if (e.key === 'Enter') sendMessage(input); };

  const toggleListen = () => {
    if (!SpeechRecognition) {
      alert('Voice input is not supported by your browser. Please try Google Chrome.');
      return;
    }
    if (listening) {
      recognizerRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
    };
    rec.onerror  = () => setListening(false);
    rec.onend    = () => setListening(false);
    rec.start();
    recognizerRef.current = rec;
    setListening(true);
  };

  const stopSpeech = () => { synth?.cancel(); setSpeaking(false); };

  return (
    <div>
      <div className="page-title">🤖 AI Voice Assistant</div>
      <p className="page-subtitle">
        Ask me anything — health tips, reminders, or just say hello!
        {SpeechRecognition ? ' 🎙️ Voice input is supported.' : ' ℹ️ Voice input requires Google Chrome.'}
      </p>

      <div className="chat-wrap">
        <div className="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`msg msg-${msg.from}`}>
              <div className="msg-avatar">{msg.from === 'bot' ? '🤖' : '👤'}</div>
              <div>
                <div
                  className="msg-bubble"
                  style={{
                    whiteSpace: 'pre-line',
                    opacity: msg.loading ? 0.6 : 1,
                    fontStyle: msg.loading ? 'italic' : 'normal',
                  }}
                >
                  {msg.text.replace(/\*\*/g, '')}
                </div>
                {msg.time && <div className="msg-time">{msg.time}</div>}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-bar">
          <button
            className={`mic-btn ${listening ? 'listening' : ''}`}
            onClick={toggleListen}
            title={listening ? 'Stop listening' : 'Start voice input'}
            disabled={loading}
          >
            {listening ? '⏹' : '🎙️'}
          </button>
          <input
            className="chat-input"
            placeholder={
              loading   ? 'Please wait…' :
              listening ? 'Listening… speak now' :
              'Type your message here…'
            }
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button
            className="btn btn-primary"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
          >
            {loading ? '⏳' : '➤ Send'}
          </button>
          {speaking && (
            <button className="btn btn-outline btn-sm" onClick={stopSpeech} title="Stop speaking">
              🔇
            </button>
          )}
        </div>
      </div>

      <p className="chat-tip">
        💡 Tip: Press <strong>Enter</strong> or click <strong>Send</strong> to chat.
        Use the <strong>🎙️ microphone</strong> button to speak your question.
        {speaking && <span style={{ color: 'var(--green)', marginLeft: 8 }}>🔊 Speaking…</span>}
      </p>

      {/* QUICK QUESTION BUTTONS */}
      <div style={{ marginTop: 20 }}>
        <p style={{ fontWeight: 700, marginBottom: 10, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          💬 Quick Questions:
        </p>
        <div className="flex-gap">
          {['What can you do?', 'Give me a health tip', 'I feel lonely', 'Tell me a joke', 'Water reminder'].map(q => (
            <button
              key={q}
              className="btn btn-outline btn-sm"
              onClick={() => sendMessage(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
