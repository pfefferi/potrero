import { useState } from 'react';
import projectsData from '../data/projects.json';

export default function Proyectos() {
  const [abierto, setAbierto] = useState(null);

  return (
    <div className="page">
      <div className="page-header">
        <h2>🔬 Proyectos de Investigación</h2>
        <p className="subtitle">7 proyectos de la salida de campo</p>
      </div>

      <div className="proyectos-list">
        {projectsData.map(proyecto => (
          <div
            key={proyecto.id}
            className={`proyecto-card ${abierto === proyecto.id ? 'open' : ''}`}
            onClick={() => setAbierto(abierto === proyecto.id ? null : proyecto.id)}
          >
            <div className="proyecto-header">
              <div className="proyecto-num">{proyecto.id}</div>
              <h3 className="proyecto-titulo">{proyecto.titulo}</h3>
              <span className="proyecto-toggle">{abierto === proyecto.id ? '▼' : '▶'}</span>
            </div>

            {abierto === proyecto.id && (
              <div className="proyecto-body">
                <div className="proyecto-section">
                  <strong>Hipótesis</strong>
                  <p>{proyecto.hipotesis}</p>
                </div>
                <div className="proyecto-section">
                  <strong>Método</strong>
                  <p>{proyecto.metodo}</p>
                </div>
                <div className="proyecto-section">
                  <strong>Datos a recolectar</strong>
                  <p>{proyecto.datos}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
