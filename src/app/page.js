"use client"; // Esto permite que la página sea interactiva
import { useEffect, useState } from 'react';

export default function Home() {
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Esta función llama a nuestra API interna
    fetch('/api/partidos')
      .then(res => res.json())
      .then(data => {
        setPartidos(data);
        setCargando(false);
      });
  }, []);

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-6">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-blue-500">⚾ MLB Stats Agent</h1>
        <p className="text-slate-400">Cartelera para hoy</p>
      </header>

      <main className="w-full max-w-md space-y-4">
        {cargando ? (
          <p className="text-center animate-pulse">Consultando a la liga...</p>
        ) : partidos.length > 0 ? (
          partidos.map((juego) => (
            <div key={juego.gamePk} className="p-4 bg-slate-800 rounded-xl border border-slate-700 shadow-lg">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>{juego.teams.away.team.name}</span>
                <span className="text-sm text-slate-500 font-normal">@</span>
                <span>{juego.teams.home.team.name}</span>
              </div>
              <div className="mt-2 text-xs text-blue-400 font-mono">
                Estado: {juego.status.abstractGameState}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-slate-500">No hay partidos programados para hoy.</p>
        )}
      </main>
    </div>
  );
}