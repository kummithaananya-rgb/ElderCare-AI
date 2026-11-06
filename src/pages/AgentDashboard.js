import React, { useState, useEffect, useRef } from 'react';

// ── Agent colour map — matches the three agent names returned by the backend ──
const AGENT_COLOURS = {
  HealthMonitor:      { bg: '#dbeafe', text: '#1d4ed8', border: '#2563eb' },
  MedicineAdvisor:    { bg: '#dcfce7', text: '#15803d', border: '#16a34a' },
  WellbeingCompanion: { bg: '#ede9fe', text: '#6d28d9', border: '#7c3aed' },
  default:            { bg: '#f0f7ff', text: '#64748b', border: '#e2e8f0' },
};

function agentColour(name) {
  return AGENT_COLOURS[name] || AGENT_COLOURS.default;
}

const GREET = {
  id: 0,
  from: 'bot',
  text: "Hello! 👋 I'm the ElderCare AI Agent Hub. Ask me anything about your health, medicines, or how you're feeling — I'll connect you with the right specialist agent.",
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  agentName:  null,
  agentLabel: null,
  agentDesc:  null,
};

// Agent info panel shown at the top of the page
const AGENT_INFO = [
  {
    name:  'HealthMonitor',
    label: '🩺 Health Monitor',
    desc:  'Health, wellness & vitals',
    colour: AGENT_COLOURS.HealthMonitor,
    topics: 'Blood pressure, symptoms, sleep, diet, exercise, health diary',
  },
  {
    name:  'MedicineAdvisor',
    label: '💊 Medicine Advisor',
    desc:  'Medication schedules & guidance',
    colour: AGENT_COLOURS.MedicineAdvisor,
    topics: 'Medicine reminders, schedules, dosage questions, pharmacy advice',
  },
  {
    name:  'WellbeingCompanion',
    label: '💙 Wellbeing Companion',
    desc:  'Emotional support & daily wellbeing',
    colour: AGENT_COLOURS.WellbeingCompanion,
    topics: 'Loneliness, mood, family, hobbies, relaxation, daily routines',
  },
];

// Safely detect Speech APIs
const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
  : null;
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

export default function AgentDashboard() {
  const [messages, setMessages]   = useState([GREET]);
  const [input, setInput]         = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [lastAgent, setLastAgent] = useState(null);   // tracks most-recently active agent
  const recognizerRef = useRef(null);
  const bottomRef     = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build history array excluding the greeting and loading placeholders
  const buildHistory = (msgs) =>
    msgs
      .filter(m => m.id !== 0 && !m.loading)
      .slice(-20)
      .map(m => ({ role: m.from === 'bot' ? 'assistant' : 'user', content: m.text }));

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

  // Calls /api/agents/run and updates message list
  const fetchAgentReply = async (userText, history, thinkingId) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/agents/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history }),
      });

      let reply, agentName, agentLabel, agentDesc;

      if (res.ok) {
        const data = await res.json();
        reply      = data.reply      && data.reply.trim()      ? data.reply      : '🤔 I received an empty response. Please try again.';
        agentName  = data.agent_name  || null;
        agentLabel = data.agent_label || null;
        agentDesc  = data.agent_desc  || null;
        if (agentName) setLastAgent({ name: agentName, label: agentLabel, desc: agentDesc });
      } else {
        reply = '⚠️ The agent service is temporarily unavailable. Please try again in a moment.';
        agentName = agentLabel = agentDesc = null;
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
            agentName,
            agentLabel,
            agentDesc,
          },
        ];
      });
      speak(reply);

    } catch {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== thinkingId);
        return [
          ...filtered,
          {
            id: Date.now(),
            from: 'bot',
            text: '⚠️ Could not reach the backend. Please check that the server is running on port 8000.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            agentName: null, agentLabel: null, agentDesc: null,
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  // Sends the message: snapshot history, add user + thinking bubble, fire fetch
  const sendMessage = (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');

    // Compute history and IDs from current messages state BEFORE calling
    // setMessages, so the updater is a pure function with no side-effects.
    // React 18 Strict Mode double-invokes updater functions to detect impurity;
    // putting fetchAgentReply inside the updater caused a double API call.
    const history    = buildHistory(messages);
    const now        = Date.now();
    const thinkingId = now + 1;

    setMessages(prev => [
      ...prev,
      {
        id: now, from: 'user', text: trimmed,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentName: null, agentLabel: null, agentDesc: null,
      },
      {
        id: thinkingId, from: 'bot', text: '⏳ Routing to the best agent…',
        time: '', loading: true,
        agentName: null, agentLabel: null, agentDesc: null,
      },
    ]);

    fetchAgentReply(trimmed, history, thinkingId);
  };

  const handleKey = e => { if (e.key === 'Enter') sendMessage(input); };

  const toggleListen = () => {
    if (!SpeechRecognition) {
      alert('Voice input is not supported by your browser. Please try Google Chrome.');
      return;
    }
    if (listening) { recognizerRef.current?.stop(); setListening(false); return; }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
    rec.start();
    recognizerRef.current = rec;
    setListening(true);
  };

  const stopSpeech = () => { synth?.cancel(); setSpeaking(false); };

  return (
    <div>
      <div className="page-title">🧠 Agent Hub</div>
      <p className="page-subtitle">
        Your questions are automatically routed to the most suitable specialist AI agent.
      </p>

      {/* AGENT INFO CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {AGENT_INFO.map(agent => {
          const isActive = lastAgent && lastAgent.name === agent.name;
          const c = agent.colour;
          return (
            <div
              key={agent.name}
              style={{
                background: isActive ? c.bg : 'var(--surface)',
                border: `2px solid ${isActive ? c.border : 'var(--border)'}`,
                borderRadius: 14,
                padding: '14px 16px',
                transition: 'all .2s',
                boxShadow: isActive ? `0 0 0 3px ${c.border}22` : 'var(--shadow)',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isActive ? c.text : 'var(--text)', marginBottom: 4 }}>
                {agent.label}
              </div>
              <div style={{ fontSize: '0.78rem', color: isActive ? c.text : 'var(--text-muted)', marginBottom: 6 }}>
                {agent.desc}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {agent.topics}
              </div>
              {isActive && (
                <div style={{ marginTop: 8, display: 'inline-block', background: c.border, color: '#fff', fontSize: '0.7rem', fontWeight: 700, borderRadius: 99, padding: '2px 10px' }}>
                  ● Active
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CHAT AREA */}
      <div className="chat-wrap">
        <div className="chat-messages">
          {messages.map(msg => {
            const c = msg.agentName ? agentColour(msg.agentName) : agentColour('default');
            return (
              <div key={msg.id} className={`msg msg-${msg.from}`}>
                <div className="msg-avatar">{msg.from === 'bot' ? '🧠' : '👤'}</div>
                <div style={{ maxWidth: '100%' }}>
                  {/* Agent badge — shown on bot messages that have agent metadata */}
                  {msg.from === 'bot' && msg.agentLabel && (
                    <div style={{
                      display: 'inline-block',
                      background: c.bg,
                      color: c.text,
                      border: `1px solid ${c.border}`,
                      borderRadius: 99,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 10px',
                      marginBottom: 5,
                    }}>
                      {msg.agentLabel}
                    </div>
                  )}
                  <div
                    className="msg-bubble"
                    style={{
                      whiteSpace: 'pre-line',
                      opacity: msg.loading ? 0.6 : 1,
                      fontStyle: msg.loading ? 'italic' : 'normal',
                      borderTopLeftRadius: msg.from === 'bot' ? 4 : undefined,
                    }}
                  >
                    {msg.text.replace(/\*\*/g, '')}
                  </div>
                  {msg.time && <div className="msg-time">{msg.time}</div>}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* INPUT BAR */}
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
              loading   ? 'Agent is responding…' :
              listening ? 'Listening… speak now' :
              'Ask a health, medicine, or wellbeing question…'
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
        💡 The agent shown above each reply is the specialist that answered your question.
        {speaking && <span style={{ color: 'var(--green)', marginLeft: 8 }}>🔊 Speaking…</span>}
      </p>

      {/* QUICK QUESTION BUTTONS */}
      <div style={{ marginTop: 20 }}>
        <p style={{ fontWeight: 700, marginBottom: 10, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          💬 Try these sample questions:
        </p>
        <div className="flex-gap">
          {[
            'What is my blood pressure goal?',
            'When should I take my medicine?',
            'I feel lonely today',
            'How much water should I drink?',
            'I can\'t sleep well at night',
          ].map(q => (
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
