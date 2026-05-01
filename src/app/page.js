"use client";
import { useEffect, useState } from 'react';

export default function Home() {
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('/api/partidos')
      .then(res => res.json())
      .then(data => {
        setPartidos(data);
        setCargando(false);
      })
      .catch(err => console.error("Error cargando partidos:", err));
  }, []);

  // --- LÓGICA DEL AGENTE INTELIGENTE ---
  const obtenerAnalisis = (juego) => {
    const v = juego.teams.away;
    const l = juego.teams.home;
    
    const pctV = parseFloat(v.leagueRecord.pct) || 0;
    const pctL = parseFloat(l.leagueRecord.pct) || 0;

    // 1. Predicción de Ganador (Moneyline)
    const favorito = pctV > pctL ? v.team.name : l.team.name;
    
    // Calcular confianza (basado en la brecha entre equipos)
    const diferencia = Math.abs(pctV - pctL);
    let confianzaBase = 50 + (diferencia * 100);
    const confianza = Math.min(Math.round(confianzaBase), 95); // Tope de 95%

    // 2. Predicción de Runline (-1.5 / +1.5)
    // Si la diferencia de nivel es alta (> 10%), sugerimos que el favorito gana por 2+ carreras
    const runline = diferencia > 0.10 
      ? `${favorito} -1.5` 
      : `${pctV < pctL ? v.team.name : l.team.name} +1.5`;

    // 3. Predicción de Altas / Bajas (Over/Under)
    // Promedio de la liga es ~8.5. Si ambos equipos son fuertes (> .500), sugerimos Altas
    const promedioPuntos = (pctV + pctL) / 2;
    const total = promedioPuntos > 0.52 ? "Altas (Over 8.5)" : "Bajas (Under 8.5)";

    return { favorito, confianza, runline, total, diferencia };
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-4">
      {/* Encabezado */}
      <header className="text-center mt-6 mb-10">
        <h1 className="text-4xl font-extrabold text-blue-500 tracking-tight">⚾ MLB PRO AGENT</h1>
        <p className="text-slate-400 text-sm mt-2 uppercase tracking-widest">Análisis Estadístico Avanzado</p>
      </header>

      {/* Cuerpo Principal */}
      <main className="w-full max-w-2xl space-y-6">
        {cargando ? (
          <div className="flex flex-col items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-slate-400 animate-pulse">Sincronizando con MLB Stats API...</p>
          </div>
        ) : partidos.length > 0 ? (
          partidos.map((juego) => {
            const analisis = obtenerAnalisis(juego);
            return (
              <div key={juego.gamePk} className="bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
                
                {/* Info del Estadio */}
                <div className="px-6 py-3 bg-slate-700/30 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <span>{juego.venue.name}</span>
                  <span className="text-blue-400">Match ID: {juego.gamePk}</span>
                </div>

                {/* Marcador / Equipos */}
                <div className="p-8 flex justify-between items-center">
                  <div className="flex flex-col items-center w-2/5">
                    <div className="w-12 h-12 bg-slate-700 rounded-full mb-3 flex items-center justify-center text-xl font-black">
                      {juego.teams.away.team.name.charAt(0)}
                    </div>
                    <span className="font-bold text-center leading-tight">{juego.teams.away.team.name}</span>
                    <span className="text-xs text-slate-500 mt-1 italic">
                      {juego.teams.away.leagueRecord.wins}-{juego.teams.away.leagueRecord.losses}
                    </span>
                  </div>

                  <div className="text-2xl font-black text-slate-700">VS</div>

                  <div className="flex flex-col items-center w-2/5">
                    <div className="w-12 h-12 bg-slate-700 rounded-full mb-3 flex items-center justify-center text-xl font-black">
                      {juego.teams.home.team.name.charAt(0)}
                    </div>
                    <span className="font-bold text-center leading-tight">{juego.teams.home.team.name}</span>
                    <span className="text-xs text-slate-500 mt-1 italic">
                      {juego.teams.home.leagueRecord.wins}-{juego.teams.home.leagueRecord.losses}
                    </span>
                  </div>
                </div>

                {/* MÓDULO DE INTELIGENCIA */}
                <div className="bg-blue-600/10 p-6 border-t border-blue-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex items-center text-blue-400 font-bold text-xs uppercase tracking-wider">
                      <span className="mr-2">🤖</span> Agente Predictor
                    </span>
                    <span className="text-xs font-black bg-blue-500 px-2 py-1 rounded">
                      {analisis.confianza}% CONFIDENCIA
                    </span>
                  </div>

                  {/* Mercado de Apuestas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700">
                      <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Runline Sugerido</p>
                      <p className="text-sm font-bold text-white">{analisis.runline}</p>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700">
                      <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Totales (U/O)</p>
                      <p className="text-sm font-bold text-white">{analisis.total}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-slate-300">Pick Directo: <span className="text-green-400 font-bold">{analisis.favorito}</span></p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-slate-800 rounded-3xl border border-slate-700">
            <p className="text-slate-500 italic">No hay encuentros programados para hoy.</p>
          </div>
        )}
      </main>

      <footer className="mt-12 mb-6 text-slate-600 text-[10px] text-center uppercase tracking-widest leading-relaxed">
        Análisis basado en tendencias de récord de liga<br/>
        &copy; 2026 MLB AI Agent - Augusto
      </footer>
    </div>
  );
}