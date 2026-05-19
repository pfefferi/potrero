import { useState } from 'react';
import scheduleData from '../data/schedule.json';

export default function Cronograma({ grupo }) {
  const [diaActivo, setDiaActivo] = useState(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    return (diaSemana >= 1 && diaSemana <= 3) ? diaSemana - 1 : 0;
  });

  const dia = scheduleData.dias[diaActivo];

  return (
    <div className="page">
      <div className="page-header">
        <h2>📅 Cronograma</h2>
        <p className="subtitle">{scheduleData.title}</p>
        {grupo && (
          <div className="mi-grupo-badge">
            {grupo} — <button className="cambiar-grupo" onClick={() => window.location.reload()}>cambiar</button>
          </div>
        )}
      </div>

      <div className="day-tabs">
        {scheduleData.dias.map((d, i) => (
          <button
            key={d.dia}
            className={`day-tab ${i === diaActivo ? 'active' : ''}`}
            onClick={() => setDiaActivo(i)}
          >
            {d.dia}
          </button>
        ))}
      </div>

      <p className="day-desc">{dia.descripcion}</p>

      {dia.actividades.map((act, i) => (
        <div key={i} className="actividad-card">
          <div className="actividad-header">
            <span className="actividad-hora">{act.hora}</span>
            <span className="actividad-nombre">{act.actividad}</span>
          </div>
          {act.nota && (
            <div className="actividad-nota">⚠️ {act.nota}</div>
          )}
          {act.general && (
            <p className="actividad-general">{act.general}</p>
          )}
          {act.detalleGrupos && (
            <div className="grupos-grid">
              {act.detalleGrupos.map((dg, j) => (
                <div
                  key={j}
                  className={`grupo-card ${grupo === dg.grupo ? 'mi-grupo' : ''}`}
                >
                  <div className="grupo-label">{dg.grupo}</div>
                  <div className="grupo-ambiente">{dg.ambiente}</div>
                  <div className="grupo-enfoque">{dg.enfoque}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {scheduleData.notas && (
        <div className="notas-campo">
          <h3>📌 Notas de campo</h3>
          <ul>
            {scheduleData.notas.map((nota, i) => (
              <li key={i}>{nota}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
