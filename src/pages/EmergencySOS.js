import React, { useState, useEffect } from 'react';

export default function EmergencySOS() {
  const [showModal, setShowModal]   = useState(false);
  const [confirmed, setConfirmed]   = useState(false);
  const [countdown, setCountdown]   = useState(null);

  // Load contacts from localStorage
  const contacts = (() => {
    try { return JSON.parse(localStorage.getItem('family_contacts')) || []; }
    catch { return []; }
  })();

  // Countdown before "alert"
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { setConfirmed(true); setCountdown(null); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSOS = () => { setShowModal(true); setConfirmed(false); setCountdown(null); };
  const cancelSOS = () => { setShowModal(false); setConfirmed(false); setCountdown(null); };
  const startAlert = () => setCountdown(3);

  return (
    <div>
      <div className="page-title">🆘 Emergency SOS</div>
      <p className="page-subtitle">Press the red button below if you need urgent help.</p>

      {/* INSTRUCTION CARD */}
      <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--red)', background: '#fff5f5' }}>
        <h3 style={{ color: 'var(--red)', marginBottom: 8 }}>⚠️ Important — Please Read</h3>
        <ul style={{ paddingLeft: 22, lineHeight: 2, color: 'var(--text)', fontSize: '1rem' }}>
          <li><strong>For a life-threatening emergency</strong>, call your local emergency number immediately (e.g. <strong>911</strong>, <strong>112</strong>, or <strong>108</strong>).</li>
          <li>This app does <strong>not</strong> automatically contact emergency services.</li>
          <li>Use the contacts below to call a family member or caregiver directly.</li>
          <li>Keep your phone fully charged and close to you at all times.</li>
        </ul>
      </div>

      {/* BIG SOS BUTTON */}
      <div className="sos-center">
        <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: 10 }}>
          Tap the button below to start an emergency alert
        </p>
        <div className="sos-btn-wrap">
          <button className="sos-big-btn" onClick={handleSOS} aria-label="Emergency SOS">
            🆘
            <span>SOS</span>
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Large red button — easy to press in any emergency
        </p>
      </div>

      {/* QUICK CALL CONTACTS */}
      <div className="card" style={{ marginTop: 28 }}>
        <h3 style={{ marginBottom: 16, color: 'var(--primary-dark)' }}>📞 Quick Emergency Contacts</h3>
        {contacts.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <div className="empty-state-icon">👥</div>
            <p>No contacts saved yet. Go to <strong>Family Contacts</strong> to add them.</p>
          </div>
        ) : (
          <ul className="contact-list-sos">
            {contacts.map(c => (
              <li key={c.id}>
                <span style={{ fontSize: '1.5rem' }}>👤</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>{c.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.relation}</div>
                </div>
                <a href={`tel:${c.phone}`} className="btn btn-red btn-sm">📞 Call</a>
              </li>
            ))}
          </ul>
        )}

        {/* HARDCODED EMERGENCY NUMBERS */}
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <p style={{ fontWeight: 700, marginBottom: 10, color: 'var(--red)' }}>🚨 Emergency Services</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[['🚑 Ambulance','108'],['🚒 Fire Dept','101'],['🚔 Police','100'],['📞 Emergency','112']].map(([label,num]) => (
              <a key={num} href={`tel:${num}`} className="btn btn-red">
                {label} — <strong>{num}</strong>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* SAFETY TIPS */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 12, color: 'var(--primary-dark)' }}>🛡️ Safety Tips</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {[
            { icon: '📱', tip: 'Always keep your phone charged above 50%' },
            { icon: '🏠', tip: 'Keep emergency numbers posted near the door' },
            { icon: '💊', tip: 'Keep a list of all your medicines handy' },
            { icon: '🚪', tip: 'Do not open the door to strangers' },
            { icon: '🤝', tip: 'Check in with family members daily' },
            { icon: '🔦', tip: 'Keep a torch near your bed for night emergencies' },
          ].map(s => (
            <div key={s.tip} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--bg)', borderRadius: 10 }}>
              <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
              <span style={{ fontSize: '0.88rem', color: 'var(--text)' }}>{s.tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="sos-modal-overlay" onClick={e => e.target === e.currentTarget && cancelSOS()}>
          <div className="sos-modal">
            {!confirmed ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🆘</div>
                <h2>Emergency Alert</h2>
                <p>
                  {countdown !== null
                    ? `Sending alert in ${countdown}… Press Cancel to stop.`
                    : 'Do you need emergency help? This will prepare your emergency contacts for calling.'}
                </p>

                {contacts.length > 0 && (
                  <ul className="contact-list-sos">
                    {contacts.slice(0,3).map(c => (
                      <li key={c.id}>
                        <span>👤</span>
                        <span style={{ flex:1 }}>{c.name} — {c.relation}</span>
                        <a href={`tel:${c.phone}`} className="btn btn-red btn-sm">📞 Call Now</a>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="sos-modal-actions">
                  {countdown === null ? (
                    <button className="btn btn-red btn-lg" style={{ width:'100%' }} onClick={startAlert}>
                      🆘 Yes, Alert Family Now
                    </button>
                  ) : (
                    <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--red)' }}>{countdown}</div>
                  )}
                  <button className="btn btn-outline btn-lg" style={{ width:'100%' }} onClick={cancelSOS}>
                    ✕ Cancel — I am Safe
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>📞</div>
                <h2 style={{ color: 'var(--green)' }}>Contact Your Family</h2>
                <p>
                  Please call a family member or caregiver using the buttons below.<br />
                  <strong>This app does not automatically send messages or alerts.</strong>
                </p>
                {contacts.length > 0 ? (
                  <ul className="contact-list-sos">
                    {contacts.map(c => (
                      <li key={c.id}>
                        <span>👤</span>
                        <span style={{ flex:1 }}>{c.name} ({c.relation})<br />
                          <small style={{ color: 'var(--text-muted)' }}>{c.phone}</small>
                        </span>
                        <a href={`tel:${c.phone}`} className="btn btn-red btn-sm">📞 Call</a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: 'var(--red)', fontWeight: 700 }}>
                    No contacts saved. Please call emergency services: <a href="tel:112" style={{ color: 'var(--red)' }}>112</a>
                  </p>
                )}
                <button className="btn btn-green" style={{ width:'100%', marginTop: 12 }} onClick={cancelSOS}>
                  ✓ I am Safe Now
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
