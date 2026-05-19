import { useState, useEffect } from 'react';
import antsSchema from '../data/forms/ants.json';
import birdsSchema from '../data/forms/birds.json';
import spidersSchema from '../data/forms/spiders.json';
import fungiSchema from '../data/forms/fungi.json';
import envSchema from '../data/forms/environment.json';
import {
  saveEntry,
  getEntries,
  deleteEntry,
  savePhoto,
  getPhotosForEntry,
  deletePhoto,
  photoToUrl
} from '../db';

const formSchemas = {
  hormigas: antsSchema,
  aves: birdsSchema,
  aranas: spidersSchema,
  hongos: fungiSchema,
  ambientales: envSchema
};

function PhotoPicker({ entryId, onAdd }) {
  const handleFile = async (files) => {
    for (const file of files) {
      const compressed = await compressImage(file);
      const id = await savePhoto(entryId, compressed, file.name);
      onAdd(id, file.name);
    }
  };

  return (
    <div className="photo-picker">
      <button
        className="btn btn-small"
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment';
          input.multiple = true;
          input.onchange = (e) => handleFile(e.target.files);
          input.click();
        }}
      >
        📷 Agregar foto
      </button>
    </div>
  );
}

function PhotoThumbnail({ entryId, photoId, onDelete }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    getPhotosForEntry(entryId).then(photos => {
      const photo = photos.find(p => p.id === photoId);
      if (photo) {
        photoToUrl(photo).then(setUrl);
      }
    });
  }, [entryId, photoId]);

  if (!url) return <div className="photo-thumb loading">📷</div>;

  return (
    <div className="photo-thumb">
      <img src={url} alt="" onClick={() => window.open(url)} />
      <button className="photo-delete" onClick={() => onDelete(photoId)}>✕</button>
    </div>
  );
}

async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 1200;
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = h * maxSize / w; w = maxSize; }
        else { w = w * maxSize / h; h = maxSize; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(resolve, 'image/jpeg', 0.7);
    };
    img.src = URL.createObjectURL(file);
  });
}

function FormRenderer({ schema, formId }) {
  const [values, setValues] = useState(
    Object.fromEntries(schema.fields.map(f => [f.key, '']))
  );
  const [entries, setEntries] = useState([]);
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [entryPhotos, setEntryPhotos] = useState({});
  const [showSaved, setShowSaved] = useState(false);

  // Load saved entries + their photos on mount
  useEffect(() => {
    getEntries(formId).then(async (loaded) => {
      setEntries(loaded);
      // Load photo counts for each entry
      const photosMap = {};
      for (const entry of loaded) {
        const photos = await getPhotosForEntry(entry.id);
        photosMap[entry.id] = photos;
      }
      setEntryPhotos(photosMap);
    });
  }, [formId]);

  const handleChange = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleAdd = async () => {
    const entry = {
      id: `entry-${Date.now()}`,
      formId,
      data: { ...values },
      photoCount: 0,
      createdAt: new Date().toISOString()
    };
    await saveEntry(entry);
    setEntries(prev => [...prev, entry]);
    setEntryPhotos(prev => ({ ...prev, [entry.id]: [] }));

    // Reset only per-observation fields
    const reset = {};
    schema.fields.forEach(f => {
      if (['cantidad', 'especie', 'genero', 'codigo_tela', 'tipo_tela', 'planta',
           'temperatura', 'humedad', 'textura', 'prof_mantillo', 'dist_rio', 'ph',
           'cob_gramineas', 'cob_herbaceas', 'cob_suelo_desnudo', 'cob_hojarasca',
           'cob_enredaderas', 'cob_musgo', 'cob_arbustos', 'cob_canopia',
           'plato'].includes(f.key)) {
        reset[f.key] = '';
      }
    });
    setValues(prev => ({ ...prev, ...reset }));
  };

  const handleDeletePhoto = async (entryId, photoId) => {
    await deletePhoto(photoId);
    setEntryPhotos(prev => ({
      ...prev,
      [entryId]: (prev[entryId] || []).filter(p => p.id !== photoId)
    }));
  };

  const handleUndo = async () => {
    if (entries.length === 0) return;
    const last = entries[entries.length - 1];
    await deleteEntry(last.id);
    setEntries(prev => prev.slice(0, -1));
  };

  const handleExport = async () => {
    if (entries.length === 0) return;
    const headers = ['ID', 'Fecha', ...schema.fields.map(f => f.label), 'Fotos', 'Timestamp'];
    const rows = await Promise.all(entries.map(async e => {
      const photos = await getPhotosForEntry(e.id);
      const photoNames = photos.map(p => p.name || 'foto').join('; ');
      return [
        e.id,
        e.data.fecha || '',
        ...schema.fields.map(f => e.data[f.key] ?? ''),
        photos.length,
        e.createdAt
      ];
    }));
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planilla-${formId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = async () => {
    if (!confirm('¿Borrar todos los registros de esta planilla?')) return;
    const entriesCopy = [...entries];
    for (const e of entriesCopy) {
      await deleteEntry(e.id);
    }
    setEntries([]);
    setEntryPhotos({});
  };

  return (
    <div className="form-container">
      {/* New entry form */}
      <div className="form-section">
        <h3 className="section-title">Nuevo registro</h3>
        <div className="form-fields">
          {schema.fields.map(field => (
            <div key={field.key} className="form-field">
              <label>{field.label}</label>
              {field.type === 'select' && (
                <select
                  value={values[field.key]}
                  onChange={e => handleChange(field.key, e.target.value)}
                >
                  <option value="">-- Seleccionar --</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              {field.type === 'textarea' && (
                <textarea
                  value={values[field.key]}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder || ''}
                  rows={3}
                />
              )}
              {field.type === 'date' && (
                <input
                  type="date"
                  value={values[field.key]}
                  onChange={e => handleChange(field.key, e.target.value)}
                />
              )}
              {field.type === 'time' && (
                <input
                  type="time"
                  value={values[field.key]}
                  onChange={e => handleChange(field.key, e.target.value)}
                />
              )}
              {(field.type === 'text' || field.type === 'number') && (
                <input
                  type={field.type}
                  value={values[field.key]}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder || ''}
                  inputMode={field.type === 'number' ? 'decimal' : 'text'}
                />
              )}
            </div>
          ))}
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            + Agregar registro
          </button>
        </div>
      </div>

      {/* Saved entries */}
      {entries.length > 0 && (
        <div className="form-section">
          <div className="section-header">
            <h3 className="section-title">Registros guardados ({entries.length})</h3>
            <div className="section-actions">
              <button className="btn btn-small" onClick={() => setShowSaved(!showSaved)}>
                {showSaved ? 'Ocultar' : 'Ver'}
              </button>
              <button className="btn btn-small" onClick={handleExport}>
                📥 CSV
              </button>
              <button className="btn btn-small danger" onClick={handleClearAll}>
                🗑️
              </button>
            </div>
          </div>

          {showSaved && (
            <div className="saved-entries">
              {entries.map((entry, i) => {
                const photos = entryPhotos[entry.id] || [];
                const isExpanded = expandedEntry === entry.id;
                return (
                  <div key={entry.id} className="saved-entry">
                    <div
                      className="saved-entry-header"
                      onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                    >
                      <span className="saved-entry-num">{i + 1}</span>
                      <span className="saved-entry-summary">
                        {entry.data.fecha || 'Sin fecha'} — {entry.data.especie || entry.data.genero || entry.data.punto || 'Registro'}
                      </span>
                      <span className="saved-entry-photos">
                        {photos.length > 0 && `📷 ${photos.length}`}
                      </span>
                      <span className="saved-entry-toggle">{isExpanded ? '▼' : '▶'}</span>
                    </div>

                    {isExpanded && (
                      <div className="saved-entry-body">
                        <div className="saved-entry-data">
                          {schema.fields.map(f => (
                            entry.data[f.key] && (
                              <div key={f.key} className="data-row">
                                <span className="data-label">{f.label}</span>
                                <span className="data-value">{entry.data[f.key]}</span>
                              </div>
                            )
                          ))}
                        </div>

                        <PhotoPicker
                          entryId={entry.id}
                          onAdd={(id, name) => {
                            setEntryPhotos(prev => ({
                              ...prev,
                              [entry.id]: [...(prev[entry.id] || []), { id, name }]
                            }));
                          }}
                        />

                        {photos.length > 0 && (
                          <div className="photo-grid">
                            {photos.map(photo => (
                              <PhotoThumbnail
                                key={photo.id}
                                entryId={entry.id}
                                photoId={photo.id}
                                onDelete={(photoId) => handleDeletePhoto(entry.id, photoId)}
                              />
                            ))}
                          </div>
                        )}

                        <button
                          className="btn btn-small danger"
                          onClick={async () => {
                            await deleteEntry(entry.id);
                            setEntries(prev => prev.filter(e => e.id !== entry.id));
                            setEntryPhotos(prev => {
                              const next = { ...prev };
                              delete next[entry.id];
                              return next;
                            });
                            if (expandedEntry === entry.id) setExpandedEntry(null);
                          }}
                        >
                          Eliminar registro
                        </button>
                      </div>
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

export default function Planillas() {
  const [formActivo, setFormActivo] = useState('hormigas');
  const schema = formSchemas[formActivo];

  return (
    <div className="page">
      <div className="page-header">
        <h2>📝 Planillas de Campo</h2>
        <p className="subtitle">Registra datos, agrega fotos y exporta como CSV</p>
      </div>

      {schema.recordatorio && (
        <div className="recordatorio">
          <strong>⚠️ Recordatorio:</strong> {schema.recordatorio}
        </div>
      )}
      {schema.nota && (
        <div className="recordatorio info">
          <strong>ℹ️ Nota:</strong> {schema.nota}
        </div>
      )}
      {schema.notaCuadrantes && (
        <div className="recordatorio info">
          <strong>ℹ️ Cuadrantes:</strong> {schema.notaCuadrantes}
        </div>
      )}

      <div className="form-tabs">
        {Object.entries(formSchemas).map(([key, s]) => (
          <button
            key={key}
            className={`form-tab ${key === formActivo ? 'active' : ''}`}
            onClick={() => setFormActivo(key)}
          >
            {s.icon} {s.title}
          </button>
        ))}
      </div>

      <FormRenderer key={formActivo} schema={schema} formId={formActivo} />
    </div>
  );
}
