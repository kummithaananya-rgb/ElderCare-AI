import React, { useState } from 'react';
import './App.css';
import Home from './pages/Home';
import AIAssistant from './pages/AIAssistant';
import MedicineReminder from './pages/MedicineReminder';
import EmergencySOS from './pages/EmergencySOS';
import DailyActivities from './pages/DailyActivities';
import FamilyContacts from './pages/FamilyContacts';
import HealthDiary from './pages/HealthDiary';
import AgentDashboard from './pages/AgentDashboard';

const NAV_ITEMS = [
  { id: 'home',       label: '🏠 Home',            icon: '🏠' },
  { id: 'assistant',  label: '🤖 AI Assistant',     icon: '🤖' },
  { id: 'medicine',   label: '💊 Medicine',         icon: '💊' },
  { id: 'sos',        label: '🆘 Emergency SOS',    icon: '🆘' },
  { id: 'activities', label: '📅 Daily Activities', icon: '📅' },
  { id: 'contacts',   label: '👨‍👩‍👧 Family Contacts',  icon: '👨‍👩‍👧' },
  { id: 'diary',      label: '📓 Health Diary',     icon: '📓' },
  { id: 'agents',     label: '🧠 Agent Hub',         icon: '🧠' },
];

function App() {
  const [activePage, setActivePage] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);

  const renderPage = () => {
    switch (activePage) {
      case 'home':       return <Home navigate={setActivePage} />;
      case 'assistant':  return <AIAssistant />;
      case 'medicine':   return <MedicineReminder />;
      case 'sos':        return <EmergencySOS />;
      case 'activities': return <DailyActivities />;
      case 'contacts':   return <FamilyContacts />;
      case 'diary':      return <HealthDiary />;
      case 'agents':     return <AgentDashboard />;
      default:           return <Home navigate={setActivePage} />;
    }
  };

  return (
    <div className="app-wrapper">
      {/* TOP HEADER */}
      <header className="app-header">
        <div className="header-logo">
          <span className="logo-icon">💙</span>
          <span className="logo-text">ElderCare <span className="logo-ai">AI</span></span>
        </div>
        <nav className="desktop-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-btn ${activePage === item.id ? 'nav-btn-active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          {menuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="mobile-menu">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`mobile-nav-btn ${activePage === item.id ? 'mobile-nav-active' : ''}`}
              onClick={() => { setActivePage(item.id); setMenuOpen(false); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* PAGE CONTENT */}
      <main className="app-main">
        {renderPage()}
      </main>

      {/* BOTTOM NAV (mobile) */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`bottom-nav-btn ${activePage === item.id ? 'bottom-nav-active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label.split(' ').slice(1).join(' ')}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
