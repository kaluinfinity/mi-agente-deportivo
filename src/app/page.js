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

  const obtenerAnalisis = (juego) => {
    const v = juego.teams.away;
    const l = juego.teams.home;
    const pctV = parseFloat(v.leagueRecord.pct) || 0;
    const pctL = parseFloat(l.leagueRecord.pct) || 0;

    const favorito = pctV > pctL ? v.team.name : l.team.name;
    const diferencia = Math.abs(pctV - pctL);
    let confianzaBase = 50 + (diferencia * 100);
    const confianza = Math.min(Math.round(confianzaBase), 95);

    const runline = diferencia > 0.10 
      ? `${favorito} -1.5` 
      : `${pctV < pctL ? v.team.name : l.team.name} +1.5`;

    const promedioPuntos = (pctV + pctL) / 2;
    const total = promedioPuntos > 0.52 ? "Altas (Over 8.5)" : "Bajas (Under 8.5)";

    return { favorito, confianza, runline, total };
  };

  // Función para obtener la URL del logo oficial de la MLB
  const getLogoUrl = (teamId) => {
    return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-950 text-white p-4 font-sans">
      <header className="text-center mt-8 mb-10">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 italic tracking-tighter">
          MLB PRO AGENT
        </h1>
        <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-[0.3em] font-bold">Smart Betting Analytics</p>
      </header>

      <main className="w-full max-w-lg space-y-6">
        {cargando ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Inyectando datos...</p>
          </div>
        ) : partidos.length > 0 ? (
          partidos.map((juego) => {
            const analisis = obtenerAnalisis(juego);
            return (
              <div key={juego.gamePk} className="bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-slate-800/50">
                
                <div className="px-6 py-3 bg-slate-800/30 flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  <span>{juego.venue.name}</span>
                  <span className="flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>Live Feed</span>
                </div>

                <div className="p-8 flex justify-between items-center bg-gradient-to-b from-transparent to-slate-900/50">
                  {/* Equipo Visitante */}
                  <div className="flex flex-col items-center w-2/5">
                    <div className="w-20 h-20 bg-white/5 p-3 rounded-3xl mb-3 flex items-center justify-center backdrop-blur-sm border border-white/10">
                      <img 
                        src={getLogoUrl(juego.teams.away.team.id)} 
                        alt={juego.teams.away.team.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="font-black text-center text-sm leading-tight h-10 flex items-center capitalize">{juego.teams.away.team.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {juego.teams.away.leagueRecord.wins}W - {juego.teams.away.leagueRecord.losses}L
                    </span>
                  </div>

                  <div className="text-xs font-black text-slate-800">VS</div>

                  {/* Equipo Local */}
                  <div className="flex flex-col items-center w-2/5">
                    <div className="w-20 h-20 bg-white/5 p-3 rounded-3xl mb-3 flex items-center justify-center backdrop-blur-sm border border-white/10">
                      <img 
                        src={getLogoUrl(juego.teams.home.team.id)} 
                        alt={juego.teams.home.team.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="font-black text-center text-sm leading-tight h-10 flex items-center capitalize">{juego.teams.home.team.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {juego.teams.home.leagueRecord.wins}W - {juego.teams.home.leagueRecord.losses}L
                    </span>
                  </div>
                </div>

                <div className="bg-blue-600/5 p-6 border-t border-white/5">
                  <div className="flex items-center justify-between mb-5">
                    <span className="flex items-center text-blue-400 font-black text-[10px] uppercase tracking-tighter">
                      <span className="text-lg mr-2">🤖</span> AI PREDICTION
                    </span>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-green-400 leading-none">{analisis.confianza}%</p>
                        <p className="text-[8px] text-slate-500 uppercase font-black">Accuracy</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 shadow-inner">
                      <p className="text-[8px] text-slate-500 uppercase font-black mb-1 tracking-widest">Runline</p>
                      <p className="text-xs font-bold text-white">{analisis.runline}</p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 shadow-inner">
                      <p className="text-[8px] text-slate-500 uppercase font-black mb-1 tracking-widest">Totals</p>
                      <p className="text-xs font-bold text-white">{analisis.total}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-blue-500/10 p-3 rounded-xl">
                    <p className="text-xs font-medium text-slate-300">Top Pick:</p>
                    <p className="text-sm font-black text-blue-400">{analisis.favorito}</p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20">
            <p className="text-slate-600 italic font-serif tracking-widest uppercase text-xs">No active games scheduled</p>
          </div>
        )}
      </main>

      <footer className="mt-16 mb-8 text-slate-700 text-[8px] text-center font-black uppercase tracking-[0.4em]">
        Augusto Dev &bull; Neural Sports Lab &bull; 2026
      </footer>
    </div>
  );
}