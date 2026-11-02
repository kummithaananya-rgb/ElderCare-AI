import React, { useState, useEffect } from 'react';

const MOODS = [
  { emoji: '😄', label: 'Great',    color: '#16a34a' },
  { emoji: '😊', label: 'Good',     color: '#2563eb' },
  { emoji: '😐', label: 'Okay',     color: '#d97706' },
  { emoji: '😔', label: 'Low',      color: '#7c3aed' },
  { emoji: '😢', label: 'Bad',      color: '#dc2626' },
];

const SYMPTOMS = [
  '💊 Took all medicines', '💧 Drank enough water', '🚶 Went for a walk',
  '😴 Slept well', '🍽️ Ate properly', '😖 Headache', '😤 Shortness of breath',
  '🦵 Joint pain', '😵 Dizziness', '🤢 Nausea', '💓 Chest discomfort',
];

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatEntryDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${d}, ${y}`;
}

const EMPTY_ENTRY = { mood: '', symptoms: [], note: '', bp: '', weight: '', sugar: '' };

export default function HealthDiary() {
  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem('health_diary')) || {}; }
    catch { return {}; }
  });

  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [form, setForm]   = useState(EMPTY_ENTRY);
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState('form'); // 'form' | 'history'

  // Load entry for selected date into form
  useEffect(() => {
    const existing = entries[selectedDate];
    setForm(existing ? { ...EMPTY_ENTRY, ...existing } : EMPTY_ENTRY);
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem('health_diary', JSON.stringify(entries));
  }, [entries]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const toggleSymptom = (sym) => {
    setForm(f => ({
      ...f,
      symptoms: f.symptoms.includes(sym)
        ? f.symptoms.filter(s => s !== sym)
        : [...f.symptoms, sym],
    }));
  };

  const saveEntry = () => {
    if (!form.mood) { showToast('⚠️ Please select your mood before saving.'); return; }
    setEntries(prev => ({ ...prev, [selectedDate]: { ...form, savedAt: new Date().toLocaleTimeString() } }));
    showToast('✅ Diary entry saved successfully!');
  };

  const deleteEntry = (key) => {
    if (window.confirm(`Delete entry for ${formatEntryDate(key)}?`)) {
      setEntries(prev => { const e = { ...prev }; delete e[key]; return e; });
      if (key === selectedDate) setForm(EMPTY_ENTRY);
      showToast('🗑️ Entry deleted.');
    }
  };

  const entryKeys = Object.keys(entries).sort((a,b) => b.localeCompare(a));
  const moodEntry  = MOODS.find(m => m.label === form.mood);

  return (
    <div>
      <div className="page-title">📓 Health Diary</div>
      <p className="page-subtitle">Log your daily health, mood, and symptoms to share with your doctor.</p>

      {toast && (
        <div className="toast" style={{ marginBottom: 16 }}>
          <div className="toast-title">Health Diary</div>
          {toast}
        </div>
      )}

      {/* TAB TOGGLE */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button
          className={`btn btn-sm ${viewMode === 'form' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setViewMode('form')}
        >
          📝 Log Today
        </button>
        <button
          className={`btn btn-sm ${viewMode === 'history' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setViewMode('history')}
        >
          📚 History ({entryKeys.length})
        </button>
      </div>

      {/* ---- FORM VIEW ---- */}
      {viewMode === 'form' && (
        <div>
          {/* Date selector */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>📅 Date:</span>
              <input
                className="form-input"
                type="date"
                style={{ maxWidth: 200 }}
                value={selectedDate}
                max={todayKey()}
                onChange={e => setSelectedDate(e.target.value)}
              />
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedDate(todayKey())}>
                Today
              </button>
              {entries[selectedDate] && (
                <span className="badge badge-green">✓ Entry saved</span>
              )}
            </div>
          </div>

          {/* MOOD SELECTOR */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 14, color: 'var(--primary-dark)' }}>😊 How are you feeling today?</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {MOODS.map(m => (
                <button
                  key={m.label}
                  onClick={() => setForm(f => ({ ...f, mood: m.label }))}
                  style={{
                    border: `3px solid ${form.mood === m.label ? m.color : 'var(--border)'}`,
                    borderRadius: 14,
                    padding: '14px 20px',
                    background: form.mood === m.label ? m.color + '18' : 'var(--surface)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all .18s',
                    minWidth: 80,
                  }}
                >
                  <div style={{ fontSize: '2rem' }}>{m.emoji}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: form.mood === m.label ? m.color : 'var(--text)' }}>
                    {m.label}
                  </div>
                </button>
              ))}
            </div>
            {moodEntry && (
              <p style={{ marginTop: 12, color: moodEntry.color, fontWeight: 600 }}>
                {moodEntry.emoji} You selected: <strong>{moodEntry.label}</strong>
              </p>
            )}
          </div>

          {/* VITALS */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 14, color: 'var(--primary-dark)' }}>🩺 Today's Vitals (Optional)</h3>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                <label className="form-label">🩸 Blood Pressure (e.g. 120/80)</label>
                <input className="form-input" placeholder="120/80 mmHg"
                  value={form.bp} onChange={e => setForm(f => ({ ...f, bp: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 130 }}>
                <label className="form-label">⚖️ Weight (kg)</label>
                <input className="form-input" placeholder="e.g. 68" type="number"
                  value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                <label className="form-label">🍬 Blood Sugar (mg/dL)</label>
                <input className="form-input" placeholder="e.g. 110" type="number"
                  value={form.sugar} onChange={e => setForm(f => ({ ...f, sugar: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* SYMPTOMS / CHECKBOXES */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 14, color: 'var(--primary-dark)' }}>🩹 Symptoms & Activities</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {SYMPTOMS.map(sym => (
                <button
                  key={sym}
                  onClick={() => toggleSymptom(sym)}
                  style={{
                    border: `2px solid ${form.symptoms.includes(sym) ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 99,
                    padding: '8px 16px',
                    background: form.symptoms.includes(sym) ? 'var(--primary-light)' : 'var(--surface)',
                    color: form.symptoms.includes(sym) ? 'var(--primary)' : 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    transition: 'all .15s',
                  }}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* NOTES */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 10, color: 'var(--primary-dark)' }}>✏️ Additional Notes</h3>
            <textarea
              className="form-input"
              placeholder="Write anything you want to remember — how you felt, what you ate, what the doctor said…"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={4}
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
            />
          </div>

          <button className="btn btn-primary btn-lg" onClick={saveEntry} style={{ width: '100%' }}>
            💾 Save Today's Entry
          </button>
        </div>
      )}

      {/* ---- HISTORY VIEW ---- */}
      {viewMode === 'history' && (
        <div>
          {entryKeys.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📓</div>
              <p>No diary entries yet. Switch to <strong>"Log Today"</strong> tab to add your first entry!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {entryKeys.map(key => {
                const e = entries[key];
                const mood = MOODS.find(m => m.label === e.mood);
                return (
                  <div key={key} className="card" style={{ borderLeft: `4px solid ${mood?.color || 'var(--primary)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '2rem' }}>{mood?.emoji || '📓'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>{formatEntryDate(key)}</div>
                        <div style={{ fontSize: '0.85rem', color: mood?.color || 'var(--text-muted)', fontWeight: 600 }}>
                          Mood: {e.mood || 'Not recorded'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => { setSelectedDate(key); setViewMode('form'); }}>
                          ✏️ Edit
                        </button>
                        <button className="btn btn-sm btn-red" onClick={() => deleteEntry(key)}>🗑</button>
                      </div>
                    </div>

                    {(e.bp || e.weight || e.sugar) && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                        {e.bp && <span className="badge badge-blue">🩸 BP: {e.bp}</span>}
                        {e.weight && <span className="badge badge-blue">⚖️ {e.weight} kg</span>}
                        {e.sugar && <span className="badge badge-orange">🍬 Sugar: {e.sugar} mg/dL</span>}
                      </div>
                    )}

                    {e.symptoms && e.symptoms.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {e.symptoms.map(s => (
                          <span key={s} style={{ fontSize: '0.78rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 99, padding: '3px 10px' }}>{s}</span>
                        ))}
                      </div>
                    )}

                    {e.note && (
                      <p style={{ marginTop: 10, fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        📝 {e.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
