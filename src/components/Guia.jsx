import { useState, useEffect, useMemo } from 'react';
import avesData from '../data/species/aves.json';
import mamiferosData from '../data/species/mamiferos.json';
import reptilesData from '../data/species/reptiles.json';
import anfibiosData from '../data/species/anfibios.json';
import pecesData from '../data/species/peces.json';
import floraData from '../data/species/flora.json';
import exoticosData from '../data/species/exoticos.json';
import { getChecklist, toggleChecklistItem, clearChecklist } from '../db';

const grupos = {
  aves: { icon: '🐦', titulo: 'Aves', lista: avesData },
  mamiferos: { icon: '🦡', titulo: 'Mamíferos', lista: mamiferosData },
  reptiles: { icon: '🦎', titulo: 'Reptiles', lista: reptilesData },
  anfibios: { icon: '🐸', titulo: 'Anfibios', lista: anfibiosData },
  peces: { icon: '🐟', titulo: 'Peces', lista: pecesData },
  flora: { icon: '🌿', titulo: 'Flora', lista: floraData },
  exoticos: { icon: '🦚', titulo: 'Exóticos', lista: exoticosData },
};

export default function Guia() {
  const [grupoActivo, setGrupoActivo] = useState('aves');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarSoloNoVistos, setMostrarSoloNoVistos] = useState(false);
  const [checklist, setChecklist] = useState({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load checklist from IndexedDB
  useEffect(() => {
    getChecklist().then(setChecklist);
  }, []);

  const grupo = grupos[grupoActivo];
  const grupoKey = grupoActivo;

  const toggleVisto = async (index) => {
    const key = `${grupoKey}:${index}`;
    const isVisto = !!checklist[key];
    if (isVisto) {
      await toggleChecklistItem(key, null);
      setChecklist(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      await toggleChecklistItem(key, { visto: true, timestamp: new Date().toISOString(), grupo: grupoKey });
      setChecklist(prev => ({ ...prev, [key]: { visto: true, timestamp: new Date().toISOString(), grupo: grupoKey } }));
    }
  };

  const handleClearChecklist = async () => {
    await clearChecklist();
    setChecklist({});
    setShowClearConfirm(false);
  };

  // Count stats
  const stats = useMemo(() => {
    const total = grupo.lista.length;
    let vistos = 0;
    grupo.lista.forEach((_, i) => {
      if (checklist[`${grupoKey}:${i}`]) vistos++;
    });
    return { total, vistos };
  }, [grupo, grupoKey, checklist]);

  // Filter and sort species
  const filtradas = useMemo(() => {
    return grupo.lista.map((e, i) => ({ ...e, index: i })).filter(especie => {
      // Search filter
      if (busqueda) {
        const b = busqueda.toLowerCase();
        if (!especie.nombre.toLowerCase().includes(b) &&
            !(especie.nombreCient && especie.nombreCient.toLowerCase().includes(b))) {
          return false;
        }
      }

      // "Only unseen" filter
      if (mostrarSoloNoVistos && checklist[`${grupoKey}:${especie.index}`]) {
        return false;
      }
      return true;
    });
  }, [grupo, busqueda, mostrarSoloNoVistos, checklist, grupoKey]);

  // Sort: unseen first
  const ordenadas = useMemo(() => {
    return [...filtradas].sort((a, b) => {
      const vistoA = !!checklist[`${grupoKey}:${a.index}`];
      const vistoB = !!checklist[`${grupoKey}:${b.index}`];
      if (vistoA !== vistoB) return vistoA ? 1 : -1;
      return a.nombre.localeCompare(b.nombre, 'es');
    });
  }, [filtradas, checklist, grupoKey]);

  return (
    <div className="page">
      <div className="page-header">
        <div className="guia-stats">
          <h2>📖 Guía de Especies</h2>
          <div className="stats-bar">
            <span className="stat-badge stat-total">{stats.total} especies</span>
            <span className="stat-badge stat-vistos">✅ {stats.vistos} vistas</span>
            {stats.vistos > 0 && (
              <span className="stat-badge stat-pct">{Math.round(stats.vistos / stats.total * 100)}%</span>
            )}
          </div>
          {stats.vistos > 0 && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(stats.vistos / stats.total * 100)}%` }} />
            </div>
          )}
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por nombre común o científico..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      <div className="guia-filtros">
        <button
          className={`filtro-btn ${mostrarSoloNoVistos ? 'active' : ''}`}
          onClick={() => setMostrarSoloNoVistos(!mostrarSoloNoVistos)}
        >
          {mostrarSoloNoVistos ? '👁️ Solo no vistas' : '🔲 Solo no vistas'}
        </button>
      </div>

      <div className="grupo-tabs">
        {Object.entries(grupos).map(([key, g]) => {
          // Count vistos for each group badge
          let v = 0;
          g.lista.forEach((_, i) => { if (checklist[`${key}:${i}`]) v++; });
          return (
            <button
              key={key}
              className={`grupo-tab ${key === grupoActivo ? 'active' : ''}`}
              onClick={() => { setGrupoActivo(key); setBusqueda(''); setMostrarSoloNoVistos(false); }}
            >
              {g.icon} {g.titulo} {v > 0 && <span className="tab-count">{v}/{g.lista.length}</span>}
            </button>
          );
        })}
      </div>

      {stats.vistos > 0 && (
        <div className="guia-actions">
          {showClearConfirm ? (
            <div className="confirm-clear">
              <span>¿Borrar toda la lista?</span>
              <button className="btn btn-small danger" onClick={handleClearChecklist}>Sí, borrar</button>
              <button className="btn btn-small" onClick={() => setShowClearConfirm(false)}>Cancelar</button>
            </div>
          ) : (
            <button className="btn btn-small danger" onClick={() => setShowClearConfirm(true)}>
              🗑️ Reiniciar checklist
            </button>
          )}
        </div>
      )}

      <div className="especies-list">
        {ordenadas.length === 0 ? (
          <p className="sin-resultados">
            {mostrarSoloNoVistos && stats.vistos === stats.total
              ? '🎉 ¡Viste todas las especies de este grupo!'
              : `No se encontraron especies con "${busqueda}"`}
          </p>
        ) : (
          <>
            {ordenadas.length < grupo.lista.length && (
              <div className="resultados-count">
                Mostrando {ordenadas.length} de {grupo.lista.length}
              </div>
            )}
            {ordenadas.map(especie => {
              const visto = !!checklist[`${grupoKey}:${especie.index}`];
              return (
                <div
                  key={`${grupoKey}:${especie.index}`}
                  className={`especie-card ${visto ? 'visto' : ''}`}
                  onClick={() => toggleVisto(especie.index)}
                >
                  <div className="especie-check">
                    <span className="check-icon">{visto ? '✅' : '⬜'}</span>
                  </div>
                  <div className="especie-info">
                    <div className="especie-nombre">{especie.nombre}</div>
                    {especie.nombreCient && (
                      <div className="especie-cientifico">{especie.nombreCient}</div>
                    )}
                    <div className="especie-meta">
                      {especie.notas && <span className="especie-notas">{especie.notas}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <p className="guia-nota">Tocá una especie para marcarla como vista</p>
    </div>
  );
}
