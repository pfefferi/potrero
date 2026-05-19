import { useState } from 'react';
import avesData from '../data/species/aves.json';
import mamiferosData from '../data/species/mamiferos.json';
import reptilesData from '../data/species/reptiles.json';
import anfibiosData from '../data/species/anfibios.json';
import pecesData from '../data/species/peces.json';
import floraData from '../data/species/flora.json';

const grupos = {
  aves: { icon: '🐦', titulo: 'Aves', lista: avesData },
  mamiferos: { icon: '🦡', titulo: 'Mamíferos', lista: mamiferosData },
  reptiles: { icon: '🦎', titulo: 'Reptiles', lista: reptilesData },
  anfibios: { icon: '🐸', titulo: 'Anfibios', lista: anfibiosData },
  peces: { icon: '🐟', titulo: 'Peces', lista: pecesData },
  flora: { icon: '🌿', titulo: 'Flora', lista: floraData },
};

export default function Guia() {
  const [grupoActivo, setGrupoActivo] = useState('aves');
  const [busqueda, setBusqueda] = useState('');

  const grupo = grupos[grupoActivo];
  const filtradas = busqueda
    ? grupo.lista.filter(e =>
        e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (e.nombreCient && e.nombreCient.toLowerCase().includes(busqueda.toLowerCase()))
      )
    : grupo.lista;

  return (
    <div className="page">
      <div className="page-header">
        <h2>📖 Guía de Especies</h2>
        <p className="subtitle">
          Catálogo de El Potrero — {grupo.lista.length} {grupo.titulo.toLowerCase()}
        </p>
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar especie..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      <div className="grupo-tabs">
        {Object.entries(grupos).map(([key, g]) => (
          <button
            key={key}
            className={`grupo-tab ${key === grupoActivo ? 'active' : ''}`}
            onClick={() => { setGrupoActivo(key); setBusqueda(''); }}
          >
            {g.icon} {g.titulo}
          </button>
        ))}
      </div>

      <div className="especies-list">
        {filtradas.length === 0 ? (
          <p className="sin-resultados">No se encontraron especies con &quot;{busqueda}&quot;</p>
        ) : (
          filtradas.map((e, i) => (
            <div key={i} className="especie-card">
              <div className="especie-nombre">{e.nombre}</div>
              {e.nombreCient && (
                <div className="especie-cientifico">{e.nombreCient}</div>
              )}
              {e.notas && <div className="especie-notas">{e.notas}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
