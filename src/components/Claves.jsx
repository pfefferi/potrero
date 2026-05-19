import { useState, useEffect } from 'react';

export default function Claves() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const claves = [
    {
      id: 'hormigas',
      nombre: 'Clave de Hormigas',
      icon: '🐜',
      desc: 'Clave dicotómica de géneros de hormigas (setae.js)',
      tipo: 'link-externo',
      url: 'https://pfefferi.github.io/Setae.js',
      offlineMsg: 'Sin conexión — la clave de hormigas requiere internet'
    },
    {
      id: 'hongos',
      nombre: 'Clave de Hongos',
      icon: '🍄',
      desc: 'Clave visual de hongos de El Potrero',
      tipo: 'pdf',
      archivo: '/pdf/clave-hongos.pdf'
    },
    {
      id: 'telaranas',
      nombre: 'Guía de Telarañas',
      icon: '🕸️',
      desc: 'Guía visual de tipos de telarañas',
      tipo: 'pdf',
      archivo: '/pdf/guia-telaranas.pdf'
    },
    {
      id: 'aves',
      nombre: 'Aves y Hongos',
      icon: '🐦',
      desc: 'Resumen de aves y hongos de El Potrero',
      tipo: 'pdf',
      archivo: '/pdf/aves-hongos.pdf'
    }
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2>🔍 Claves de Identificación</h2>
        <p className="subtitle">Herramientas para identificar organismos en campo</p>
        <div className={`online-status ${online ? 'online' : 'offline'}`}>
          {online ? '🟢 En línea' : '🔴 Sin conexión'}
        </div>
      </div>

      <div className="claves-grid">
        {claves.map(clave => (
          <div key={clave.id} className="clave-card">
            <div className="clave-icon">{clave.icon}</div>
            <h3>{clave.nombre}</h3>
            <p className="clave-desc">{clave.desc}</p>

            {clave.tipo === 'link-externo' && (
              online ? (
                <a href={clave.url} target="_blank" rel="noopener noreferrer" className="clave-btn">
                  Abrir clave de hormigas →
                </a>
              ) : (
                <span className="clave-offline">{clave.offlineMsg}</span>
              )
            )}

            {clave.tipo === 'pdf' && (
              <a href={clave.archivo} target="_blank" rel="noopener noreferrer" className="clave-btn">
                Abrir PDF →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
