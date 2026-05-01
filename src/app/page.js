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
      .catch(err => console.error("Error:", err));
  }, []);

  const obtenerAnalisisPro = (juego) => {
    const v = juego.teams.away;
    const l = juego.teams.home;
    const pV = juego.teams.away.probablePitcher;
    const pL = juego.teams.home.probablePitcher;

    // 1. Poder del Pitcheo (ERA - Entre más bajo mejor)
    // Si no hay pitcher anunciado, usamos un promedio de 4.50
    const eraV = parseFloat(pV?.stats?.find(s => s.group.displayName === 'pitching')?.stats?.era) || 4.50;
    const eraL = parseFloat(pL?.stats?.find(s => s.group.displayName === 'pitching')?.stats?.era) || 4.50;

    // 2. Récord de Equipos
    const pctV = parseFloat(v.leagueRecord.pct) || 0;
    const pctL = parseFloat(l.leagueRecord.pct) || 0;

    // LÓGICA DE PREDICCIÓN (Puntaje: Pitcheo 60% + Récord 40%)
    const scoreV = (pctV * 40) + ((10 - eraV) * 6);
    const scoreL = (pctL * 40) + ((10 - eraL) * 6) + 2; // +2 por ventaja de local

    const favorito = scoreV > scoreL ? v.team.name : l.team.name;
    const confianza = Math.min(Math.round(55 + Math.abs(scoreV - scoreL)), 96);

    // Totales basados en ERA combinada
    const eraCombinada = eraV + eraL;
    const total = eraCombinada > 9.0 ? "Altas (Picheo Débil)" : "Bajas (Duelo de Ases)";

    return { 
      favorito, 
      confianza, 
      total, 
      pitcherV: pV?.fullName || "Por anunciar", 
      pitcherL: pL?.fullName || "Por anunciar",
      eraV, 
      eraL 
    };
  };

  const getLogoUrl = (teamId) => `https://www.mlbstatic.com/team-logos/${teamId}.svg`;

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-950 text-white p-4 font-sans">
      <header className="text-center mt-6 mb-8">
        <h1 className="text-4xl font-black text-blue-500 italic">MLB INTELLIGENCE</h1>
        <p className="text-slate-500 text-[9px] uppercase tracking-[0.4em] font-bold">Deep Data Analysis v2.0</p>
      </header>

      <main className="w-full max-w-lg space-y-8">
        {cargando ? (
          <div className="text-center py-20 animate-pulse text-blue-400 font-mono text-xs">ANALIZANDO ROTACIÓN DE PITCHERS...</div>
        ) : partidos.map((juego) => {
          const ai = obtenerAnalisisPro(juego);
          return (
            <div key={juego.gamePk} className="bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl">
              
              {/* Header: Estadio y Clima */}
              <div className="px-6 py-3 bg-white/5 flex justify-between items-center text-[8px] font-black text-slate-500 uppercase tracking-widest">
                <span>{juego.venue.name}</span>
                <span className="text-blue-400">Pitcher Matchup</span>
              </div>

              {/* Matchup de Equipos */}
              <div className="p-8 flex justify-between items-start">
                <div className="flex flex-col items-center w-2/5">
                  <span className="text-[8px] font-bold text-blue-400 mb-2 uppercase italic tracking-tighter">Visitante</span>
                  <img src={getLogoUrl(juego.teams.away.team.id)} className="w-16 h-16 mb-2 object-contain" />
                  <span className="font-black text-[11px] text-center uppercase leading-tight mb-4">{juego.teams.away.team.name}</span>
                  
                  {/* Info del Pitcher */}
                  <div className="text-center bg-black/40 p-2 rounded-xl border border-white/5 w-full">
                    <p className="text-[7px] text-slate-500 uppercase font-black">Starter</p>
                    <p className="text-[10px] font-bold text-white truncate w-full px-1">{ai.pitcherV}</p>
                    <p className="text-[9px] text-blue-400 font-mono">ERA: {ai.eraV}</p>
                  </div>
                </div>

                <div className="text-[10px] font-black text-slate-800 mt-20">VS</div>

                <div className="flex flex-col items-center w-2/5">
                  <span className="text-[8px] font-bold text-orange-400 mb-2 uppercase italic tracking-tighter">Local</span>
                  <img src={getLogoUrl(juego.teams.home.team.id)} className="w-16 h-16 mb-2 object-contain" />
                  <span className="font-black text-[11px] text-center uppercase leading-tight mb-4">{juego.teams.home.team.name}</span>
                  
                  {/* Info del Pitcher */}
                  <div className="text-center bg-black/40 p-2 rounded-xl border border-white/5 w-full">
                    <p className="text-[7px] text-slate-500 uppercase font-black">Starter</p>
                    <p className="text-[10px] font-bold text-white truncate w-full px-1">{ai.pitcherL}</p>
                    <p className="text-[9px] text-orange-400 font-mono">ERA: {ai.eraL}</p>
                  </div>
                </div>
              </div>

              {/* ANALISIS DE IA */}
              <div className="bg-gradient-to-r from-blue-600/10 to-transparent p-6 border-t border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center text-blue-400 font-black text-[10px] uppercase">
                        <span className="text-lg mr-2">🎯</span> AI Pick: {ai.favorito}
                    </div>
                    <span className="text-[10px] font-black bg-blue-600 px-2 py-1 rounded text-white">{ai.confianza}%</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-white/5 shadow-xl">
                    <p className="text-[7px] text-slate-500 uppercase font-black mb-1">Total Prediction</p>
                    <p className="text-[11px] font-bold text-green-400">{ai.total}</p>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-white/5 shadow-xl">
                    <p className="text-[7px] text-slate-500 uppercase font-black mb-1">Projection</p>
                    <p className="text-[11px] font-bold text-white">Focus on Starter ERA</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      <footer className="mt-12 mb-8 text-slate-700 text-[8px] text-center font-black uppercase tracking-[0.5em]">
        Augusto Neural Engine &bull; 2026
      </footer>
    </div>
  );
}