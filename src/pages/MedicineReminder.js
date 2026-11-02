import React, { useState, useEffect, useCallback } from 'react';

const EMPTY_FORM = { name: '', time: '', frequency: 'Daily', note: '' };

const DEFAULT_MEDS = [
  { id: 1, name: 'Blood Pressure Tablet',   time: '08:00', frequency: 'Daily',  note: 'Take with water',        taken: false },
  { id: 2, name: 'Vitamin D Supplement',    time: '09:00', frequency: 'Daily',  note: 'Take after breakfast',   taken: false },
  { id: 3, name: 'Diabetes Medicine',       time: '13:00', frequency: 'Daily',  note: 'Take before lunch',      taken: false },
  { id: 4, name: 'Heart Medicine',          time: '20:00', frequency: 'Daily',  note: 'Take after dinner',      taken: false },
];

function fmt12(t) {
  if (!t) return '';
  const [hh, mm] = t.split(':').map(Number);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h = hh % 12 || 12;
  return `${h}:${String(mm).padStart(2,'0')} ${ampm}`;
}

function isUpcoming(time) {
  if (!time) return false;
  const [hh, mm] = time.split(':').map(Number);
  const now = new Date();
  const med = new Date(); med.setHours(hh, mm, 0, 0);
  const diff = (med - now) / 60000; // minutes
  return diff >= 0 && diff <= 60;
}

export default function MedicineReminder() {
  const [meds, setMeds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('meds')) || DEFAULT_MEDS; }
    catch { return DEFAULT_MEDS; }
  });
  const [form, setForm]   = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    localStorage.setItem('meds', JSON.stringify(meds));
  }, [meds]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Check every minute for upcoming meds
  useEffect(() => {
    const check = () => {
      meds.filter(m => !m.taken && isUpcoming(m.time)).forEach(m => {
        showToast(`⏰ Time to take: ${m.name} at ${fmt12(m.time)}`);
        // Browser notification if allowed
        if (Notification.permission === 'granted') {
          new Notification('💊 Medicine Reminder', { body: `Time to take ${m.name}` });
        }
      });
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, [meds, showToast]);

  const requestNotif = () => {
    if ('Notification' in window) Notification.requestPermission();
  };

  const addMed = () => {
    if (!form.name.trim() || !form.time) { showToast('⚠️ Please enter medicine name and time.'); return; }
    const newMed = { id: Date.now(), ...form, taken: false };
    setMeds(prev => [...prev, newMed]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    showToast('✅ Medicine added successfully!');
  };

  const toggleTaken = id => setMeds(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
  const deleteMed   = id => { if (window.confirm('Remove this medicine?')) setMeds(prev => prev.filter(m => m.id !== id)); };
  const resetAll    = () => setMeds(prev => prev.map(m => ({ ...m, taken: false })));

  const filtered = filter === 'taken'   ? meds.filter(m => m.taken)
                 : filter === 'pending' ? meds.filter(m => !m.taken)
                 : meds;
  const takenCount = meds.filter(m => m.taken).length;

  return (
    <div>
      <div className="page-title">💊 Medicine Reminders</div>
      <p className="page-subtitle">Track your daily medicines and never miss a dose.</p>

      {toast && (
        <div className="toast toast-medicine" style={{ marginBottom: 16 }}>
          <div className="toast-title">Medicine Alert</div>
          {toast}
        </div>
      )}

      {/* STATS BAR */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 130, textAlign: 'center', padding: '14px 12px' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{meds.length}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Total Medicines</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 130, textAlign: 'center', padding: '14px 12px' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--green)' }}>{takenCount}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Taken Today</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 130, textAlign: 'center', padding: '14px 12px' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--orange)' }}>{meds.length - takenCount}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Remaining</div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancel' : '+ Add Medicine'}
        </button>
        <button className="btn btn-outline btn-sm" onClick={resetAll}>🔄 Reset Today</button>
        <button className="btn btn-outline btn-sm" onClick={requestNotif}>🔔 Enable Notifications</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {['all','pending','taken'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ADD FORM */}
      {showForm && (
        <div className="card med-add-form">
          <h3 style={{ marginBottom: 16, color: 'var(--primary-dark)' }}>➕ Add New Medicine</h3>
          <div className="med-grid">
            <div className="form-group">
              <label className="form-label">Medicine Name *</label>
              <input className="form-input" placeholder="e.g. Metformin 500mg"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Time *</label>
              <input className="form-input" type="time"
                value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Frequency</label>
              <select className="form-select" value={form.frequency}
                onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                <option>Daily</option>
                <option>Twice a day</option>
                <option>Three times a day</option>
                <option>Weekly</option>
                <option>As needed</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" placeholder="e.g. Take with food"
              value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <button className="btn btn-primary" onClick={addMed}>💾 Save Medicine</button>
        </div>
      )}

      {/* MEDICINE LIST */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💊</div>
          <p>No medicines found. Click <strong>+ Add Medicine</strong> to get started.</p>
        </div>
      ) : (
        <div className="med-list">
          {filtered.sort((a,b) => a.time.localeCompare(b.time)).map(med => (
            <div key={med.id} className={`med-item ${med.taken ? 'taken' : ''}`}>
              <div className="med-icon">{med.taken ? '✅' : isUpcoming(med.time) ? '⏰' : '💊'}</div>
              <div className="med-info">
                <div className="med-name">{med.name}</div>
                <div className="med-time">⏰ {fmt12(med.time)} &nbsp;·&nbsp; 🔁 {med.frequency}</div>
                {med.note && <div className="med-note">📝 {med.note}</div>}
                {isUpcoming(med.time) && !med.taken && (
                  <span className="badge badge-orange" style={{ marginTop: 4 }}>⚡ Upcoming soon!</span>
                )}
              </div>
              <div className="med-actions">
                <button
                  className={`btn btn-sm ${med.taken ? 'btn-outline' : 'btn-green'}`}
                  onClick={() => toggleTaken(med.id)}
                >
                  {med.taken ? '↩ Undo' : '✓ Taken'}
                </button>
                <button className="btn btn-sm btn-red" onClick={() => deleteMed(med.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
