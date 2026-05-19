import { useState, useEffect } from 'react';
import Cronograma from './components/Cronograma';
import Claves from './components/Claves';
import Guia from './components/Guia';
import Planillas from './components/Planillas';
import Proyectos from './components/Proyectos';
import { gpsTrack } from './gps';
import './App.css';

const tabs = [
  { id: 'hoy', label: 'Hoy', icon: '📅' },
  { id: 'claves', label: 'Claves', icon: '🔍' },
  { id: 'guia', label: 'Guía', icon: '📖' },
  { id: 'planillas', label: 'Planillas', icon: '📝' },
  { id: 'proyectos', label: 'Proyectos', icon: '🔬' },
];

function App() {
  const [tab, setTab] = useState('hoy');
  const [tema, setTema] = useState(() => {
    return localStorage.getItem('potrero-tema') || 'claro';
  });
  const [grupo, setGrupo] = useState(() => {
    return localStorage.getItem('potrero-grupo') || '';
  });
  const [gpsStatus, setGpsStatus] = useState(() => gpsTrack.getLatest() ? 'on' : 'off');

  useEffect(() => {
    return gpsTrack.subscribe(pos => setGpsStatus(pos ? 'on' : 'off'));
  }, []);

  const toggleTema = () => {
    const nuevo = tema === 'claro' ? 'oscuro' : 'claro';
    setTema(nuevo);
    localStorage.setItem('potrero-tema', nuevo);
  };

  const seleccionarGrupo = (g) => {
    setGrupo(g);
    localStorage.setItem('potrero-grupo', g);
  };

  return (
    <div className={tema === 'oscuro' ? 'app oscuro' : 'app'}>
      <header className="app-header">
        <div className="header-top">
          <div className="header-brand">
            <span className="header-icon">🌿</span>
            <div>
              <h1>Compañera de Campo</h1>
              <span className="header-sub">El Potrero — Ecología General, UNLP</span>
            </div>
          </div>
          <button className="theme-toggle" onClick={toggleTema} aria-label="Cambiar tema">
            {tema === 'claro' ? '🌙' : '☀️'}
          </button>
          <span className={`gps-indicator ${gpsStatus === 'on' ? 'active' : ''}`} title="GPS">
            {gpsStatus === 'on' ? '📍' : '📍'}
          </span>
        </div>

        {!grupo && tab === 'hoy' && (
          <div className="grupo-selector">
            <span className="grupo-label">Seleccioná tu grupo:</span>
            <div className="grupo-buttons">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  className={`grupo-btn ${grupo === `Grupo ${n}` ? 'active' : ''}`}
                  onClick={() => seleccionarGrupo(`Grupo ${n}`)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="app-content">
        {tab === 'hoy' && <Cronograma grupo={grupo} />}
        {tab === 'claves' && <Claves />}
        {tab === 'guia' && <Guia />}
        {tab === 'planillas' && <Planillas />}
        {tab === 'proyectos' && <Proyectos />}
      </main>

      <nav className="app-nav">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
