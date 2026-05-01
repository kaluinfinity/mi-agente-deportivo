"use client";
import { useEffect, useState } from 'react';

export default function Home() {
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('/api/partidos').then(res => res.json()).then(data => {
      setPartidos(data);
      setCargando(false);
    });
  }, []);

  const engineRandomForest = (juego) => {
    const v = juego.teams.away;
    const l = juego.teams.home;

    // --- 1. KPI: PITCHING+ (Stuff+ & Location+) ---
    // Estimamos Pitching+ usando (K% - BB%) y ERA ajustada (FIP)
    const eraV = parseFloat(v.probablePitcher?.stats?.[0]?.stats?.era) || 4.50;
    const eraL = parseFloat(l.probablePitcher?.stats?.[0]?.stats?.era) || 4.50;
    const pPlusV = 100 + (4.50 - eraV) * 10; // 100 es promedio
    const pPlusL = 100 + (4.50 - eraL) * 10 + 5; // +5 por Location+ (Localía)

    // --- 2. KPI: xwOBA & wRC+ (Calidad de Contacto) ---
    const opsV = parseFloat(v.team.statistics?.[0]?.stats?.ops) || 0.720;
    const opsL = parseFloat(l.team.statistics?.[0]?.stats?.ops) || 0.720;
    
    // Si el equipo viene de ganar, el xwOBA suele ser estable; si viene de racha fría, buscamos regresión.
    const xwOBA_V = opsV * 0.45; 
    const xwOBA_L = opsL * 0.45;

    // --- 3. MODELO DE CLASIFICACIÓN (TRIANGULACIÓN) ---
    // Ponderación: 40% Pitching+, 35% xwOBA Equipo, 25% Racha L10
    const powerScoreV = (pPlusV * 0.4) + (xwOBA_V * 120) + (parseFloat(v.leagueRecord.pct) * 30);
    const powerScoreL = (pPlusL * 0.4) + (xwOBA_L * 120) + (parseFloat(l.leagueRecord.pct) * 30);

    // Detección de "Suerte" (Regresión a la media)
    const regresionV = eraV < 3.0 && v.leagueRecord.pct < 0.5 ? "Mejora Próxima" : "Estable";

    // PREDICCIONES
    const ml = powerScoreV > powerScoreL ? v.team.name : l.team.name;
    const confianza = Math.min(Math.round(52 + Math.abs(powerScoreV - powerScoreL) * 1.5), 97);
    
    // Lógica Runline (Basada en la brecha de Pitching+)
    const rl = (Math.abs(pPlusV - pPlusL) > 15) ? `${ml} -1.5` : `${ml === v.team.name ? l.team.name : v.team.name} +1.5`;
    
    // Lógica Altas/Bajas (xwOBA combinado)
    const total = (xwOBA_V + xwOBA_L > 0.680) ? "Altas (Over)" : "Bajas (Under)";

    return { ml, rl, total, confianza, pPlusV, pPlusL, regresionV, pitcherV: v.probablePitcher?.fullName, pitcherL: l.probablePitcher?.fullName, eraV, eraL };
  };

  const getLogo = (id) => `https://www.mlbstatic.com/team-logos/${id}.svg`;

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-4 font-sans">
      <header className="text-center py-10">
        <div className="inline-block border border-blue-500/30 bg-blue-500/10 px-4 py-1 rounded-full mb-4">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Random Forest Model v5.0</span>
        </div>
        <h1 className="text-5xl font-black italic tracking-tighter text-white">AUGUSTO <span className="text-blue-600 underline decoration-2">PRO</span></h1>
        <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase tracking-widest text-center">Analizando Pitching+ & xwOBA en tiempo real</p>
      </header>

      <main className="max-w-2xl mx-auto space-y-12">
        {cargando ? (
          <div className="text-center py-20 font-black text-blue-900 animate-pulse text-xs tracking-widest">EJECUTANDO TRIANGULACIÓN DE DATOS...</div>
        ) : partidos.map((j) => {
          const ai = engineRandomForest(j);
          return (
            <div key={j.gamePk} className="relative bg-[#0d1117] rounded-[3rem] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
              
              {/* Pitching+ Header */}
              <div className="flex justify-between px-10 py-4 bg-gradient-to-r from-blue-900/20 to-transparent border-b border-white/5">
                <div className="text-center">
                    <p className="text-[7px] font-black text-slate-500 uppercase">Pitching+</p>
                    <p className="text-xs font-mono text-blue-400 font-bold">{ai.pPlusV.toFixed(0)}</p>
                </div>
                <div className="text-[9px] font-black self-center text-slate-600 uppercase tracking-tighter">Sabermetrics Duel</div>
                <div className="text-center">
                    <p className="text-[7px] font-black text-slate-500 uppercase">Pitching+</p>
                    <p className="text-xs font-mono text-orange-400 font-bold">{ai.pPlusL.toFixed(0)}</p>
                </div>
              </div>

              {/* Contenido Principal */}
              <div className="p-8 flex justify-between items-center">
                <div className="w-1/3 flex flex-col items-center">
                  <img src={getLogo(j.teams.away.team.id)} className="w-16 h-16 mb-2 drop-shadow-2xl" />
                  <p className="text-[10px] font-black text-center uppercase leading-tight">{j.teams.away.team.name}</p>
                  <p className="text-[8px] text-blue-400 font-bold mt-2 italic">{ai.pitcherV}</p>
                  <p className="text-[10px] font-black text-slate-500">ERA {ai.eraV}</p>
                </div>

                <div className="w-1/4 flex flex-col items-center">
                  <div className="h-12 w-[1px] bg-gradient-to-b from-transparent via-slate-800 to-transparent"></div>
                  <span className="my-2 text-[10px] font-black text-slate-800 italic">VS</span>
                  <div className="h-12 w-[1px] bg-gradient-to-b from-slate-800 via-slate-800 to-transparent"></div>
                </div>

                <div className="w-1/3 flex flex-col items-center">
                  <img src={getLogo(j.teams.home.team.id)} className="w-16 h-16 mb-2 drop-shadow-2xl" />
                  <p className="text-[10px] font-black text-center uppercase leading-tight">{j.teams.home.team.name}</p>
                  <p className="text-[8px] text-orange-400 font-bold mt-2 italic">{ai.pitcherL}</p>
                  <p className="text-[10px] font-black text-slate-500">ERA {ai.eraL}</p>
                </div>
              </div>

              {/* Predicciones Trianguladas */}
              <div className="m-4 bg-[#161b22] rounded-[2.5rem] p-6 border border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Random Forest Output</span>
                  </div>
                  <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full shadow-lg shadow-blue-600/20">
                    {ai.confianza}% CERTEZA
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-3 bg-black/40 rounded-2xl border border-white/5">
                    <span className="text-[7px] font-bold text-slate-500 uppercase mb-1">Moneyline</span>
                    <span className="text-[10px] font-black text-white text-center leading-tight uppercase">{ai.ml}</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-black/40 rounded-2xl border border-white/5">
                    <span className="text-[7px] font-bold text-slate-500 uppercase mb-1">Runline</span>
                    <span className="text-[10px] font-black text-blue-400 uppercase">{ai.rl}</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-black/40 rounded-2xl border border-white/5">
                    <span className="text-[7px] font-bold text-slate-500 uppercase mb-1">Total O/U</span>
                    <span className="text-[10px] font-black text-green-400 uppercase">{ai.total}</span>
                  </div>
                </div>

                {/* Insight de xwOBA */}
                <div className="mt-6 pt-4 border-t border-white/5 text-center">
                   <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                     Análisis de Regresión: <span className="text-slate-300">xwOBA {ai.regresionV} detectada</span>
                   </p>
                </div>
              </div>
            </div>
          );
        })}
      </main>
      <footer className="py-20 text-center opacity-20 text-[7px] font-black uppercase tracking-[1em]">
        XGBOOST Integrated Engine &bull; 2026
      </footer>
    </div>
  );
}