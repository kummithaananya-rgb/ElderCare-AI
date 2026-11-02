import React, { useState, useEffect } from 'react';

const PRESETS = [
  { icon: '💧', name: 'Drink Water',       time: '08:00', color: '#dbeafe' },
  { icon: '🍽️', name: 'Breakfast',         time: '08:30', color: '#dcfce7' },
  { icon: '🚶', name: 'Morning Walk',       time: '07:00', color: '#fef3c7' },
  { icon: '💊', name: 'Take Medicine',      time: '09:00', color: '#ede9fe' },
  { icon: '☕', name: 'Morning Tea/Coffee', time: '09:30', color: '#fef9c3' },
  { icon: '🍱', name: 'Lunch',             time: '13:00', color: '#dcfce7' },
  { icon: '😴', name: 'Afternoon Nap',      time: '14:00', color: '#e0f2fe' },
  { icon: '🧘', name: 'Relaxation/Yoga',   time: '16:00', color: '#f0fdf4' },
  { icon: '🌙', name: 'Dinner',            time: '19:00', color: '#dcfce7' },
  { icon: '📺', name: 'Evening TV Time',   time: '20:00', color: '#fef3c7' },
  { icon: '🏥', name: 'Doctor Visit',      time: '10:00', color: '#fee2e2' },
  { icon: '📞', name: 'Call Family',       time: '18:00', color: '#dbeafe' },
];

const EMPTY_FORM = { name: '', time: '', icon: '📌', note: '' };
const ICONS = ['📌','💧','🍽️','🚶','💊','☕','😴','🧘','📞','🏥','🎵','📖','🌿','🛀','🧹'];

export default function DailyActivities() {
  const [activities, setActivities] = useState(() => {
    try { return JSON.parse(localStorage.getItem('activities')) || []; }
    catch { return []; }
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    localStorage.setItem('activities', JSON.stringify(activities));
  }, [activities]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const addPreset = (p) => {
    const exists = activities.find(a => a.name === p.name);
    if (exists) { showToast(`"${p.name}" is already in your list!`); return; }
    const act = { id: Date.now(), ...p, done: false, note: '' };
    setActivities(prev => [...prev, act]);
    showToast(`✅ "${p.name}" added to your activities!`);
  };

  const addCustom = () => {
    if (!form.name.trim() || !form.time) { showToast('⚠️ Please enter activity name and time.'); return; }
    const act = { id: Date.now(), ...form, done: false, color: 'var(--bg)' };
    setActivities(prev => [...prev, act]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    showToast('✅ Activity added!');
  };

  const toggleDone = id => setActivities(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));
  const deleteAct  = id => { if (window.confirm('Remove this activity?')) setActivities(prev => prev.filter(a => a.id !== id)); };
  const resetAll   = () => setActivities(prev => prev.map(a => ({ ...a, done: false })));

  const sorted = [...activities].sort((a,b) => (a.time||'').localeCompare(b.time||''));
  const doneCount = activities.filter(a => a.done).length;

  function fmt12(t) {
    if (!t) return '';
    const [hh,mm] = t.split(':').map(Number);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h = hh % 12 || 12;
    return `${h}:${String(mm).padStart(2,'0')} ${ampm}`;
  }

  return (
    <div>
      <div className="page-title">📅 Daily Activities</div>
      <p className="page-subtitle">Plan your day and stay on track with healthy routines.</p>

      {toast && (
        <div className="toast toast-activity" style={{ marginBottom: 16 }}>
          <div className="toast-title">Activity</div>
          {toast}
        </div>
      )}

      {/* PROGRESS */}
      {activities.length > 0 && (
        <div className="card" style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Today's Progress — {doneCount}/{activities.length} completed</div>
            <div style={{ background: 'var(--bg)', borderRadius: 99, height: 16, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${activities.length ? (doneCount/activities.length)*100 : 0}%`,
                background: 'linear-gradient(90deg, var(--green), #86efac)',
                borderRadius: 99,
                transition: 'width .4s',
              }} />
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={resetAll}>🔄 Reset</button>
        </div>
      )}

      {/* PRESET GRID */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 12, color: 'var(--primary-dark)' }}>
        ⚡ Quick Add — Common Activities
      </h3>
      <div className="activity-preset-grid">
        {PRESETS.map(p => (
          <button key={p.name} className="activity-preset-btn"
            style={{ borderColor: activities.find(a=>a.name===p.name) ? 'var(--green)' : 'var(--border)', background: p.color }}
            onClick={() => addPreset(p)}>
            <div className="activity-preset-icon">{p.icon}</div>
            {p.name}
            {activities.find(a=>a.name===p.name) && <div style={{ fontSize: '0.72rem', color: 'var(--green)' }}>✓ Added</div>}
          </button>
        ))}
      </div>

      {/* CUSTOM ADD BUTTON */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancel' : '+ Add Custom Activity'}
        </button>
      </div>

      {/* CUSTOM FORM */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 14, color: 'var(--primary-dark)' }}>➕ Custom Activity</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 2, minWidth: 180 }}>
              <label className="form-label">Activity Name *</label>
              <input className="form-input" placeholder="e.g. Read a book"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 130 }}>
              <label className="form-label">Time *</label>
              <input className="form-input" type="time"
                value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
              <label className="form-label">Icon</label>
              <select className="form-select" value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}>
                {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={addCustom}>💾 Save Activity</button>
        </div>
      )}

      {/* ACTIVITY LIST */}
      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <p>No activities yet. Use the quick-add buttons above to build your daily routine!</p>
        </div>
      ) : (
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 12, color: 'var(--primary-dark)' }}>
            📋 Your Daily Schedule
          </h3>
          <div className="activity-list">
            {sorted.map(act => (
              <div key={act.id} className={`activity-item ${act.done ? 'done' : ''}`}
                style={{ borderLeftWidth: 4, borderLeftColor: act.done ? 'var(--green)' : 'var(--primary)' }}>
                <span style={{ fontSize: '1.8rem' }}>{act.icon}</span>
                <div className="activity-info">
                  <div className="activity-name" style={{ textDecoration: act.done ? 'line-through' : 'none' }}>
                    {act.name}
                  </div>
                  <div className="activity-time">⏰ {fmt12(act.time)}</div>
                </div>
                {act.done && <span className="badge badge-green">✓ Done</span>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className={`btn btn-sm ${act.done ? 'btn-outline' : 'btn-green'}`}
                    onClick={() => toggleDone(act.id)}>
                    {act.done ? '↩' : '✓ Done'}
                  </button>
                  <button className="btn btn-sm btn-red" onClick={() => deleteAct(act.id)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
