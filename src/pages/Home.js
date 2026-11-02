import React, { useState, useEffect } from 'react';

const QUICK_LINKS = [
  { id: 'assistant',  icon: '🤖', title: 'AI Assistant',     desc: 'Ask me anything' },
  { id: 'medicine',   icon: '💊', title: 'Medicine',         desc: 'Track your pills' },
  { id: 'sos',        icon: '🆘', title: 'Emergency SOS',    desc: 'Call for help' },
  { id: 'activities', icon: '📅', title: 'Daily Activities', desc: 'Stay on schedule' },
  { id: 'contacts',   icon: '👨‍👩‍👧', title: 'Family Contacts', desc: 'Stay connected' },
  { id: 'diary',      icon: '📓', title: 'Health Diary',     desc: 'Log your health' },
];

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatTime(d) {
  let h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} ${ampm}`;
}

function formatDate(d) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const DEFAULT_REMINDERS = [
  { id: 1, icon: '💧', text: 'Drink a glass of water',       time: '08:00 AM', done: false },
  { id: 2, icon: '💊', text: 'Take morning medicine',        time: '09:00 AM', done: false },
  { id: 3, icon: '🚶', text: 'Morning walk – 20 minutes',    time: '07:00 AM', done: false },
  { id: 4, icon: '🍽️', text: 'Have breakfast',               time: '08:30 AM', done: false },
  { id: 5, icon: '🏥', text: 'Doctor appointment check',     time: '11:00 AM', done: false },
];

export default function Home({ navigate }) {
  const [now, setNow]           = useState(new Date());
  const [reminders, setReminders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('home_reminders')) || DEFAULT_REMINDERS; }
    catch { return DEFAULT_REMINDERS; }
  });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    localStorage.setItem('home_reminders', JSON.stringify(reminders));
  }, [reminders]);

  const toggle = id => setReminders(r => r.map(x => x.id === id ? { ...x, done: !x.done } : x));
  const reset  = () => setReminders(DEFAULT_REMINDERS.map(r => ({ ...r, done: false })));

  const done  = reminders.filter(r => r.done).length;
  const total = reminders.length;

  return (
    <div>
      {/* HERO */}
      <div className="home-hero">
        <div>
          <div className="hero-title">Good day! 👋<br />Welcome to ElderCare AI</div>
          <div className="hero-subtitle">Your smart health companion — always here to help.</div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '4px 14px', fontSize: '0.88rem' }}>
              ✅ {done}/{total} tasks done today
            </span>
            <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }} onClick={reset}>
              🔄 Reset Day
            </button>
          </div>
        </div>
        <div className="hero-datetime">
          <div className="hero-time">{formatTime(now)}</div>
          <div style={{ marginTop: 6, fontSize: '0.88rem', opacity: .88 }}>{formatDate(now)}</div>
        </div>
      </div>

      {/* QUICK NAV */}
      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14, color: 'var(--primary-dark)' }}>
        🗂️ Quick Access
      </h2>
      <div className="quick-grid" style={{ marginBottom: 28 }}>
        {QUICK_LINKS.map(item => (
          <div key={item.id} className="quick-card" onClick={() => navigate(item.id)}>
            <div className="quick-card-icon">{item.icon}</div>
            <div className="quick-card-title">{item.title}</div>
            <div className="quick-card-desc">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* TODAY'S REMINDERS */}
      <div className="card reminders-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>📋 Today's Reminders</h2>
          <span className="badge badge-blue">{done}/{total} done</span>
        </div>
        {reminders.map(r => (
          <div key={r.id} className={`reminder-item ${r.done ? 'done' : ''}`}>
            <span className="reminder-icon">{r.icon}</span>
            <span className="reminder-text" style={{ textDecoration: r.done ? 'line-through' : 'none' }}>{r.text}</span>
            <span className="reminder-time">{r.time}</span>
            <button
              className={`btn btn-sm ${r.done ? 'btn-outline' : 'btn-green'}`}
              onClick={() => toggle(r.id)}
              style={{ minWidth: 70 }}
            >
              {r.done ? '↩ Undo' : '✓ Done'}
            </button>
          </div>
        ))}
      </div>

      {/* WELLNESS TIPS */}
      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14, color: 'var(--primary-dark)' }}>
          💡 Wellness Tips for Today
        </h2>
        <div className="wellness-bar">
          {[
            { icon: '💧', label: 'Water Goal',   val: '8 glasses/day' },
            { icon: '🚶', label: 'Steps Goal',    val: '3,000 steps' },
            { icon: '😴', label: 'Sleep Goal',    val: '7–8 hours' },
            { icon: '🧘', label: 'Relax Time',    val: '15 min rest' },
          ].map(w => (
            <div key={w.label} className="wellness-card">
              <div className="wellness-icon">{w.icon}</div>
              <div className="wellness-label">{w.label}</div>
              <div className="wellness-val">{w.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
