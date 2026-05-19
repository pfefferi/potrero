import { useState, useEffect, useMemo, useRef } from 'react';
import avesData from '../data/species/aves.json';
import mamiferosData from '../data/species/mamiferos.json';
import reptilesData from '../data/species/reptiles.json';
import anfibiosData from '../data/species/anfibios.json';
import pecesData from '../data/species/peces.json';
import floraData from '../data/species/flora.json';
import exoticosData from '../data/species/exoticos.json';
import { getSightings, addSighting, removeLastSighting, updateSightingNote, clearChecklist, getAllSightingsForExport } from '../db';
import { getGPS } from '../gps';

const grupos = {
  aves: { icon: '🐦', titulo: 'Aves', lista: avesData },
  mamiferos: { icon: '🦡', titulo: 'Mamíferos', lista: mamiferosData },
  reptiles: { icon: '🦎', titulo: 'Reptiles', lista: reptilesData },
  anfibios: { icon: '🐸', titulo: 'Anfibios', lista: anfibiosData },
  peces: { icon: '🐟', titulo: 'Peces', lista: pecesData },
  flora: { icon: '🌿', titulo: 'Flora', lista: floraData },
  exoticos: { icon: '🦚', titulo: 'Exóticos', lista: exoticosData },
};

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

export default function Guia() {
  const [grupoActivo, setGrupoActivo] = useState('aves');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarSoloNoVistos, setMostrarSoloNoVistos] = useState(false);
  const [sightings, setSightings] = useState({});
  const [expandedSpecies, setExpandedSpecies] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [noteEdits, setNoteEdits] = useState({});
  const [gpsLoading, setGpsLoading] = useState(null); // species key while GPS fetches
  const gpsCache = useRef(null);

  // Load sightings from IndexedDB
  useEffect(() => {
    getSightings().then(setSightings);
  }, []);

  const grupo = grupos[grupoActivo];
  const grupoKey = grupoActivo;

  // Quick GPS — cached for 60s
  const quickGPS = async () => {
    const now = Date.now();
    if (gpsCache.current && now - gpsCache.current.ts < 60000) return gpsCache.current.pos;
    const pos = await getGPS();
    gpsCache.current = { pos, ts: now };
    return pos;
  };

  // Add a new sighting
  const handleAddSighting = async (especie) => {
    const key = `${grupoKey}:${especie.index}`;
    setGpsLoading(key);
    const gps = await quickGPS();
    setGpsLoading(null);
    await addSighting(key, gps, '');
    setSightings(prev => {
      const existing = prev[key] || [];
      return { ...prev, [key]: [...existing, { timestamp: new Date().toISOString(), gps, nota: '' }] };
    });
    // Auto-expand to show the new sighting
    setExpandedSpecies(key);
  };

  // Remove last sighting (undo)
  const handleRemoveLast = async (especie) => {
    const key = `${grupoKey}:${especie.index}`;
    await removeLastSighting(key);
    setSightings(prev => {
      const existing = prev[key] || [];
      if (existing.length <= 1) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: existing.slice(0, -1) };
    });
  };

  // Update a note
  const handleSaveNote = async (key, idx) => {
    const nota = noteEdits[`${key}:${idx}`] ?? '';
    await updateSightingNote(key, idx, nota);
    setSightings(prev => {
      const arr = [...(prev[key] || [])];
      arr[idx] = { ...arr[idx], nota };
      return { ...prev, [key]: arr };
    });
  };

  const handleClearAll = async () => {
    await clearChecklist();
    setSightings({});
    setExpandedSpecies(null);
    setShowClearConfirm(false);
  };

  // CSV export
  const handleExportCSV = async () => {
    const rows = await getAllSightingsForExport();
    if (rows.length === 0) return;
    // Get species names
    const headers = ['Grupo', 'Especie', 'Nombre científico', 'Fecha', 'Hora', 'Lat', 'Lng', 'Notas'];
    const dataRows = rows.map(r => {
      const g = grupos[r.grupo];
      const especie = g ? g.lista[r.index] : null;
      return [
        g ? g.titulo : r.grupo,
        especie?.nombre || '',
        especie?.nombreCient || '',
        r.timestamp ? formatDate(r.timestamp) : '',
        r.timestamp ? formatTime(r.timestamp) : '',
        r.gps?.lat || '',
        r.gps?.lng || '',
        r.nota || ''
      ];
    });
    const csv = [headers.join(','), ...dataRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `avistamientos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Count stats
  const totalSightings = useMemo(() => {
    let count = 0;
    for (const [key, arr] of Object.entries(sightings)) {
      if (key.startsWith(grupoKey + ':')) count += arr.length;
    }
    return count;
  }, [sightings, grupoKey]);

  const uniqueSpecies = useMemo(() => {
    let count = 0;
    for (const [key, arr] of Object.entries(sightings)) {
      if (key.startsWith(grupoKey + ':') && arr.length > 0) count++;
    }
    return count;
  }, [sightings, grupoKey]);

  // Filter and sort species
  const filtradas = useMemo(() => {
    return grupo.lista.map((e, i) => ({ ...e, index: i })).filter(especie => {
      if (busqueda) {
        const b = busqueda.toLowerCase();
        if (!especie.nombre.toLowerCase().includes(b) &&
            !(especie.nombreCient && especie.nombreCient.toLowerCase().includes(b))) {
          return false;
        }
      }
      if (mostrarSoloNoVistos && sightings[`${grupoKey}:${especie.index}`]) {
        return false;
      }
      return true;
    });
  }, [grupo, busqueda, mostrarSoloNoVistos, sightings, grupoKey]);

  // Sort: species with sightings at bottom (dimmed)
  const ordenadas = useMemo(() => {
    return [...filtradas].sort((a, b) => {
      const sA = (sightings[`${grupoKey}:${a.index}`] || []).length;
      const sB = (sightings[`${grupoKey}:${b.index}`] || []).length;
      if (sA > 0 && sB === 0) return 1;
      if (sB > 0 && sA === 0) return -1;
      return a.nombre.localeCompare(b.nombre, 'es');
    });
  }, [filtradas, sightings, grupoKey]);

  return (
    <div className="page">
      <div className="page-header">
        <div className="guia-stats">
          <h2>📖 Guía de Especies</h2>
          <div className="stats-bar">
            <span className="stat-badge stat-total">{grupo.lista.length} especies</span>
            <span className="stat-badge stat-vistos">👁️ {uniqueSpecies} vistas ({totalSightings} registros)</span>
            <button className="btn btn-small" onClick={handleExportCSV} disabled={totalSightings === 0}>
              📥 CSV
            </button>
          </div>
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
          let v = 0, s = 0;
          g.lista.forEach((_, i) => {
            const arr = sightings[`${key}:${i}`] || [];
            if (arr.length > 0) v++;
            s += arr.length;
          });
          return (
            <button
              key={key}
              className={`grupo-tab ${key === grupoActivo ? 'active' : ''}`}
              onClick={() => { setGrupoActivo(key); setBusqueda(''); setMostrarSoloNoVistos(false); setExpandedSpecies(null); }}
            >
              {g.icon} {g.titulo} {(v > 0 || s > 0) && <span className="tab-count">{v}/{g.lista.length} · {s}</span>}
            </button>
          );
        })}
      </div>

      {(totalSightings > 0 || showClearConfirm) && (
        <div className="guia-actions">
          {showClearConfirm ? (
            <div className="confirm-clear">
              <span>¿Borrar todos los registros?</span>
              <button className="btn btn-small danger" onClick={handleClearAll}>Sí</button>
              <button className="btn btn-small" onClick={() => setShowClearConfirm(false)}>No</button>
            </div>
          ) : (
            <button className="btn btn-small danger" onClick={() => setShowClearConfirm(true)}>
              🗑️ Reiniciar todo
            </button>
          )}
        </div>
      )}

      <div className="especies-list">
        {ordenadas.length === 0 ? (
          <p className="sin-resultados">
            {mostrarSoloNoVistos && uniqueSpecies === grupo.lista.length
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
              const key = `${grupoKey}:${especie.index}`;
              const regs = sightings[key] || [];
              const isExpanded = expandedSpecies === key;
              const hasSightings = regs.length > 0;
              const isLoadingGps = gpsLoading === key;

              return (
                <div
                  key={key}
                  className={`especie-card ${hasSightings ? 'visto' : ''}`}
                >
                  {/* Tap area: adds sighting */}
                  <button
                    className="especie-main"
                    onClick={() => handleAddSighting(especie)}
                    disabled={isLoadingGps}
                  >
                    <div className="especie-check">
                      {isLoadingGps ? (
                        <span className="gps-spinner">📡</span>
                      ) : hasSightings ? (
                        <span className="check-badge">{regs.length}👁️</span>
                      ) : (
                        <span className="check-icon">➕</span>
                      )}
                    </div>
                    <div className="especie-info">
                      <div className="especie-nombre">{especie.nombre}</div>
                      {especie.nombreCient && (
                        <div className="especie-cientifico">{especie.nombreCient}</div>
                      )}
                      <div className="especie-meta">
                        {especie.notas && <span className="especie-notas">{especie.notas}</span>}
                        {hasSightings && regs[regs.length - 1]?.timestamp && (
                          <span className="especie-ultima">
                            Última: {formatDate(regs[regs.length - 1].timestamp)} {formatTime(regs[regs.length - 1].timestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expand: sightings + notes */}
                  {hasSightings && (
                    <button
                      className="especie-expand"
                      onClick={() => setExpandedSpecies(isExpanded ? null : key)}
                    >
                      {isExpanded ? 'Ocultar' : 'Ver registros'} ▾
                    </button>
                  )}

                  {isExpanded && (
                    <div className="sighting-list">
                      {regs.map((s, i) => (
                        <div key={i} className="sighting-item">
                          <div className="sighting-header">
                            <span className="sighting-num">#{i + 1}</span>
                            <span className="sighting-time">
                              {formatDate(s.timestamp)} {formatTime(s.timestamp)}
                            </span>
                            <button
                              className="sighting-undo"
                              onClick={(e) => { e.stopPropagation(); handleRemoveLast(especie); }}
                              title="Eliminar este registro"
                            >
                              ✕
                            </button>
                          </div>
                          {s.gps && (
                            <div className="sighting-gps">
                              📍 {s.gps.lat}, {s.gps.lng}
                              <a
                                href={`https://www.google.com/maps?q=${s.gps.lat},${s.gps.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="gps-link"
                              >
                                Ver mapa →
                              </a>
                            </div>
                          )}
                          <div className="sighting-note">
                            <input
                              type="text"
                              className="note-input"
                              placeholder="Agregar nota..."
                              defaultValue={s.nota}
                              onBlur={(e) => {
                                if (e.target.value !== s.nota) {
                                  setNoteEdits(prev => ({ ...prev, [`${key}:${i}`]: e.target.value }));
                                  handleSaveNote(key, i);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.target.blur();
                                }
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <p className="guia-nota">Tocá una especie para registrar un avistamiento</p>
    </div>
  );
}
