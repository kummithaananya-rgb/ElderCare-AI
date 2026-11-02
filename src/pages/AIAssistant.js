import React, { useState, useEffect, useRef } from 'react';

const GREET = {
  id: 0, from: 'bot',
  text: "Hello! 👋 I'm your ElderCare AI companion. I'm here to help you with health tips, reminders, and friendly conversation. What can I help you with today?",
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

// Simple keyword-based response engine (no external API)
const RESPONSES = [
  { keys: ['hello','hi','hey','good morning','good afternoon','good evening'],
    reply: "Hello there! 😊 It's wonderful to hear from you. How are you feeling today?" },
  { keys: ['how are you','how do you do'],
    reply: "I'm doing great, thank you for asking! 💙 I'm here 24/7 just for you. How about yourself — how are you feeling?" },
  { keys: ['medicine','medication','pill','tablet','dose'],
    reply: "💊 It's very important to take your medicines on time. Go to the **Medicine Reminders** page to see your schedule and mark them as taken. Would you like me to tell you about any specific medicine?" },
  { keys: ['water','drink','hydrate','thirsty'],
    reply: "💧 Staying hydrated is so important! Elderly people should aim to drink at least 8 glasses of water every day. Try to sip water regularly throughout the day, even if you don't feel thirsty." },
  { keys: ['walk','exercise','activity','steps'],
    reply: "🚶 Light exercise is wonderful for your health! A short 20–30 minute walk each day can improve your mood, strengthen your heart, and keep your joints healthy. Start small and go at your own pace." },
  { keys: ['sleep','tired','rest','nap'],
    reply: "😴 Good sleep is essential! Try to get 7–8 hours of rest each night. Keep a regular sleep schedule, avoid screens before bed, and make sure your room is cool and quiet." },
  { keys: ['lonely','alone','sad','miss','bored'],
    reply: "💙 I understand. It's completely normal to feel that way sometimes. You're not alone — I'm always here for you! Why not call a family member? You can find their numbers in the **Family Contacts** page. Talking to loved ones always helps." },
  { keys: ['pain','hurt','ache','headache','chest'],
    reply: "⚠️ I'm sorry you're not feeling well. If you have severe pain, especially chest pain, please use the **Emergency SOS** button right away or call emergency services. For mild discomfort, please rest and contact your doctor when possible." },
  { keys: ['doctor','hospital','clinic','appointment'],
    reply: "🏥 It's great that you're taking care of your health! Make sure to keep all your doctor appointments. You can add medical appointments in the **Daily Activities** section so you don't forget them." },
  { keys: ['food','eat','hungry','meal','breakfast','lunch','dinner'],
    reply: "🍽️ Eating well is key to staying healthy. Try to have balanced meals with fresh fruits, vegetables, whole grains, and lean protein. Don't skip meals, especially breakfast! Are you feeling hungry right now?" },
  { keys: ['family','son','daughter','children','grandchildren','wife','husband'],
    reply: "👨‍👩‍👧 Family is so important! You can save your family members' contact details in the **Family Contacts** page for easy one-click calling. Would you like help with that?" },
  { keys: ['emergency','help','sos','danger'],
    reply: "🆘 If you are in an emergency, please go to the **Emergency SOS** page immediately and press the large red button. If this is a real emergency right now, please call your local emergency number (like 911 or 112) immediately." },
  { keys: ['weather','rain','hot','cold'],
    reply: "🌤️ I don't have live weather access, but I can suggest: on hot days, stay indoors and drink plenty of water. On cold days, layer your clothing and keep warm. Always dress appropriately for the weather!" },
  { keys: ['thank','thanks','appreciate','wonderful','great','good'],
    reply: "You're very welcome! 😊 It truly makes me happy to be helpful. Please don't hesitate to ask anything else — I'm always here for you!" },
  { keys: ['bye','goodbye','see you','take care'],
    reply: "Goodbye! 👋 Take good care of yourself. Stay healthy, stay happy, and remember — I'm always here whenever you need me! 💙" },
  { keys: ['joke','funny','laugh','smile'],
    reply: "😄 Here's one for you: Why don't scientists trust atoms? Because they make up everything! 😂 Laughter is the best medicine — I hope that made you smile!" },
  { keys: ['what can you do','help me','what do you know','what do you offer'],
    reply: "I can help you with:\n• 💊 Medicine reminders and health tips\n• 💧 Hydration and nutrition advice\n• 🚶 Exercise suggestions\n• 😴 Sleep tips\n• 👨‍👩‍👧 Family contact guidance\n• 🆘 Emergency guidance\n• 😊 Friendly conversation whenever you need company!\nJust ask me anything!" },
];

function getBotReply(text) {
  const lower = text.toLowerCase();
  for (const r of RESPONSES) {
    if (r.keys.some(k => lower.includes(k))) return r.reply;
  }
  return "That's a great question! 🤔 I'm still learning, but I'm always here to chat and help. For medical advice, please always consult your doctor. Is there something else I can help you with? 💙";
}

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
  const recognizerRef = useRef(null);
  const bottomRef     = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMsg = (from, text) => {
    const msg = { id: Date.now(), from, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, msg]);
    return msg;
  };

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

  const sendMessage = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addMsg('user', trimmed);
    setInput('');
    setTimeout(() => {
      const reply = getBotReply(trimmed);
      addMsg('bot', reply);
      speak(reply);
    }, 600);
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
                <div className="msg-bubble" style={{ whiteSpace: 'pre-line' }}>
                  {msg.text.replace(/\*\*/g, '')}
                </div>
                <div className="msg-time">{msg.time}</div>
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
          >
            {listening ? '⏹' : '🎙️'}
          </button>
          <input
            className="chat-input"
            placeholder={listening ? 'Listening… speak now' : 'Type your message here…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button className="btn btn-primary" onClick={() => sendMessage(input)}>
            ➤ Send
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
            <button key={q} className="btn btn-outline btn-sm" onClick={() => sendMessage(q)}>{q}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
