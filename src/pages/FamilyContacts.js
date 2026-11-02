import React, { useState, useEffect } from 'react';

const DEFAULT_CONTACTS = [
  { id: 1, name: 'Sarah (Daughter)',  relation: 'Daughter',  phone: '+1-555-0101', avatar: '👩', note: 'Primary caregiver' },
  { id: 2, name: 'Michael (Son)',     relation: 'Son',       phone: '+1-555-0102', avatar: '👨', note: 'Lives nearby' },
  { id: 3, name: 'Dr. Johnson',       relation: 'Doctor',    phone: '+1-555-0200', avatar: '👨‍⚕️', note: 'Family physician' },
];

const EMPTY_FORM = { name: '', relation: '', phone: '', note: '', avatar: '👤' };
const AVATARS = ['👤','👩','👨','👧','👦','👴','👵','👨‍⚕️','👩‍⚕️','👮','🧑‍🦳','🧓'];

export default function FamilyContacts() {
  const [contacts, setContacts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('family_contacts')) || DEFAULT_CONTACTS; }
    catch { return DEFAULT_CONTACTS; }
  });
  const [form, setForm]       = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState(null);
  const [search, setSearch]   = useState('');
  const [toast, setToast]     = useState(null);

  useEffect(() => {
    localStorage.setItem('family_contacts', JSON.stringify(contacts));
  }, [contacts]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const saveContact = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      showToast('⚠️ Please enter name and phone number.');
      return;
    }
    if (editId) {
      setContacts(prev => prev.map(c => c.id === editId ? { ...c, ...form } : c));
      showToast('✅ Contact updated!');
      setEditId(null);
    } else {
      setContacts(prev => [...prev, { id: Date.now(), ...form }]);
      showToast('✅ Contact added!');
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const editContact = (c) => {
    setForm({ name: c.name, relation: c.relation, phone: c.phone, note: c.note || '', avatar: c.avatar || '👤' });
    setEditId(c.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteContact = (id) => {
    if (window.confirm('Remove this contact?')) setContacts(prev => prev.filter(c => c.id !== id));
  };

  const cancelForm = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(false); };

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.relation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-title">👨‍👩‍👧 Family Contacts</div>
      <p className="page-subtitle">Save family members' contact details for easy one-tap calling.</p>

      {toast && (
        <div className="toast" style={{ marginBottom: 16 }}>
          <div className="toast-title">Contacts</div>
          {toast}
        </div>
      )}

      {/* ACTION BAR */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={() => { cancelForm(); setShowForm(s => !s); }}>
          {showForm && !editId ? '✕ Cancel' : '+ Add Contact'}
        </button>
        <input
          className="form-input"
          style={{ flex: 1, minWidth: 180, maxWidth: 280 }}
          placeholder="🔍 Search by name or relation…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* FORM */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, color: 'var(--primary-dark)' }}>
            {editId ? '✏️ Edit Contact' : '➕ New Contact'}
          </h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="e.g. Sarah Johnson"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
              <label className="form-label">Relationship</label>
              <input className="form-input" placeholder="e.g. Daughter"
                value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">Phone Number *</label>
              <input className="form-input" placeholder="e.g. +1-555-0101" type="tel"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
              <label className="form-label">Avatar</label>
              <select className="form-select" value={form.avatar}
                onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))}>
                {AVATARS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" placeholder="e.g. Primary caregiver, lives nearby"
              value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={saveContact}>💾 Save Contact</button>
            <button className="btn btn-outline" onClick={cancelForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* CONTACTS GRID */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <p>{search ? 'No contacts match your search.' : 'No contacts yet. Click "+ Add Contact" to get started.'}</p>
        </div>
      ) : (
        <div className="contact-grid">
          {filtered.map(c => (
            <div key={c.id} className="contact-card">
              <div className="contact-avatar">{c.avatar || '👤'}</div>
              <div>
                <div className="contact-name">{c.name}</div>
                {c.relation && <div className="contact-relation">{c.relation}</div>}
              </div>
              <div className="contact-phone">📞 {c.phone}</div>
              {c.note && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>📝 {c.note}</div>}
              <div className="contact-actions">
                <a href={`tel:${c.phone}`} className="btn btn-green btn-sm">📞 Call</a>
                <button className="btn btn-outline btn-sm" onClick={() => editContact(c)}>✏️ Edit</button>
                <button className="btn btn-sm btn-red" onClick={() => deleteContact(c.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INFO BOX */}
      <div className="card" style={{ marginTop: 24, background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
        <h3 style={{ marginBottom: 10, color: 'var(--primary-dark)' }}>💡 How to Use Contacts</h3>
        <ul style={{ paddingLeft: 20, lineHeight: 2, color: 'var(--text)', fontSize: '0.95rem' }}>
          <li>Click <strong>📞 Call</strong> to directly dial a contact on your device.</li>
          <li>Your contacts are saved on this device and available offline.</li>
          <li>Emergency SOS page will show your contacts for quick calling.</li>
          <li>Add your doctor, caregivers and close family for easy access.</li>
        </ul>
      </div>
    </div>
  );
}
