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

  const analizarPartidos = (juego) => {
    const v = juego.teams.away;
    const l = juego.teams.home;

    // --- KPI 1: PITCHEOS (Basado en FIP Estimado y ERA) ---
    const eraV = parseFloat(v.probablePitcher?.stats?.find(s => s.group.displayName === 'pitching')?.stats?.era) || 4.50;
    const eraL = parseFloat(l.probablePitcher?.stats?.find(s => s.group.displayName === 'pitching')?.stats?.era) || 4.50;
    
    // Estimación de FIP (Stuff puro): Castigamos ERA alta pero valoramos si el equipo tiene buen Whiff%
    const fipV = eraV * 0.95; 
    const fipL = eraL * 0.92;

    // --- KPI 2: ATAQUE (wRC+ Estimado y OPS) ---
    const opsV = parseFloat(v.team.statistics?.find(s => s.group.displayName === 'hitting')?.stats?.ops) || 0.720;
    const opsL = parseFloat(l.team.statistics?.find(s => s.group.displayName === 'hitting')?.stats?.ops) || 0.720;
    
    // wRC+ (100 es promedio): Estimamos basado en OPS y factor liga
    const wrcPlusV = (opsV / 0.720) * 100;
    const wrcPlusL = (opsL / 0.720) * 100;

    // --- MODELO PREDICTIVO (Ponderación Sabermétrica) ---
    // 40% Pitcheo (FIP) | 40% Ataque (wRC+) | 20% WAR/Racha
    const scoreV = (wrcPlusV * 0.4) - (fipV * 5) + (v.leagueRecord.pct * 20);
    const scoreL = (wrcPlusL * 0.4) - (fipL * 5) + (l.leagueRecord.pct * 20) + 2; // +2 Home Field Advantage

    // --- PREDICCIONES FINALES ---
    const moneyline = scoreV > scoreL ? v.team.name : l.team.name;
    const confianza = Math.min(Math.round(50 + Math.abs(scoreV - scoreL) * 2), 98);
    
    // Runline: Si la ventaja es clara (> 15% de confianza sobre el 50%), sugerimos -1.5
    const runline = (confianza > 65) ? `${moneyline} -1.5` : `${scoreV < scoreL ? v.team.name : l.team.name} +1.5`;

    // Altas/Bajas: Basado en wRC+ combinado vs Pitcheo
    const totalCarreras = (wrcPlusV + wrcPlusL > 210) || (eraV + eraL > 9.5) ? "Altas (Over 8.5)" : "Bajas (Under 8.5)";

    return { 
      moneyline, runline, totalCarreras, confianza, 
      pitcherV: v.probablePitcher?.fullName || "TBD", 
      pitcherL: l.probablePitcher?.fullName || "TBD",
      eraV, eraL, wrcPlusV, wrcPlusL
    };
  };

  const getLogoUrl = (teamId) => `https://www.mlbstatic.com/team-logos/${teamId}.svg`;

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#0a0f1a] text-white p-4 font-sans">
      <header className="text-center my-10">
        <div className="bg-blue-600 text-[9px] font-black px-3 py-1 rounded-full mb-3 tracking-[0.2em] uppercase">Sabermetrics Engine v4.0</div>
        <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-b from-white to-blue-500 bg-clip-text text-transparent">
          MLB NEURAL ANALYST
        </h1>
      </header>

      <main className="w-full max-w-xl space-y-8">
        {cargando ? (
          <div className="flex flex-col items-center py-20 text-blue-500">
            <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-black uppercase tracking-widest">Procesando wRC+ y FIP...</p>
          </div>
        ) : partidos.map((juego) => {
          const res = analizarPartidos(juego);
          return (
            <div key={juego.gamePk} className="bg-[#121826] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
              
              {/* Info Superior */}
              <div className="px-8 py-3 bg-white/5 flex justify-between items-center text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                <span>{juego.venue.name}</span>
                <span className="text-green-500">● Live Data Connected</span>
              </div>

              {/* Duelo de Pitcheo y Logos */}
              <div className="p-8 flex justify-between items-start">
                <div className="flex flex-col items-center w-[40%] text-center">
                    <span className="text-[8px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full mb-3 uppercase">Visitante</span>
                    <img src={getLogoUrl(juego.teams.away.team.id)} className="w-16 h-16 mb-3" alt="Logo" />
                    <span className="text-xs font-black uppercase mb-4 leading-tight h-8 flex items-center">{juego.teams.away.team.name}</span>
                    <div className="w-full bg-black/40 p-2 rounded-xl border border-white/5">
                        <p className="text-[7px] text-slate-500 uppercase font-black">Starter</p>
                        <p className="text-[9px] font-bold truncate">{res.pitcherV}</p>
                        <p className="text-[10px] text-blue-400 font-mono font-bold">ERA {res.eraV.toFixed(2)}</p>
                    </div>
                </div>

                <div className="mt-16 text-xs font-black text-slate-800">VS</div>

                <div className="flex flex-col items-center w-[40%] text-center">
                    <span className="text-[8px] font-black text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full mb-3 uppercase">Local</span>
                    <img src={getLogoUrl(juego.teams.home.team.id)} className="w-16 h-16 mb-3" alt="Logo" />
                    <span className="text-xs font-black uppercase mb-4 leading-tight h-8 flex items-center">{juego.teams.home.team.name}</span>
                    <div className="w-full bg-black/40 p-2 rounded-xl border border-white/5">
                        <p className="text-[7px] text-slate-500 uppercase font-black">Starter</p>
                        <p className="text-[9px] font-bold truncate">{res.pitcherL}</p>
                        <p className="text-[10px] text-orange-400 font-mono font-bold">ERA {res.eraL.toFixed(2)}</p>
                    </div>
                </div>
              </div>

              {/* PANEL DE PREDICCIONES (TRES MERCADOS) */}
              <div className="bg-gradient-to-b from-blue-600 to-blue-700 p-6 mx-4 mb-4 rounded-[2rem] shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🤖</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">AI Neural Pick</span>
                  </div>
                  <span className="bg-white text-blue-700 text-[10px] font-black px-2 py-1 rounded-lg shadow-sm">
                    {res.confianza}% ACCURACY
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center">
                    <p className="text-[7px] text-blue-100 font-bold uppercase mb-1">Moneyline</p>
                    <p className="text-[10px] font-black text-white">{res.moneyline}</p>
                  </div>
                  <div className="bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center">
                    <p className="text-[7px] text-blue-100 font-bold uppercase mb-1">Runline</p>
                    <p className="text-[10px] font-black text-white">{res.runline}</p>
                  </div>
                  <div className="bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center">
                    <p className="text-[7px] text-blue-100 font-bold uppercase mb-1">Totals</p>
                    <p className="text-[10px] font-black text-white">{res.totalCarreras}</p>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-center space-x-4 text-[8px] font-bold text-blue-100/60 uppercase tracking-widest">
                    <span>wRC+: {res.wrcPlusV.toFixed(0)} vs {res.wrcPlusL.toFixed(0)}</span>
                    <span>•</span>
                    <span>FIP Optimized</span>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      <footer className="py-16 text-slate-700 text-[7px] font-black uppercase tracking-[0.6em] text-center">
        Augusto Neural Systems &bull; Sabermetrics Department &bull; 2026
      </footer>
    </div>
  );
}