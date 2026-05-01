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

  const simularPartidoconScore = (juego) => {
    const temp = parseFloat(juego.venue.weather?.temp) || 20;
    const factorTemp = 1 + (temp - 20) * 0.018; 
    const v = juego.teams.away;
    const l = juego.teams.home;

    // Estadísticas de entrada
    const opsV = parseFloat(v.team.statistics?.[0]?.stats?.ops) || 0.720;
    const opsL = parseFloat(l.team.statistics?.[0]?.stats?.ops) || 0.720;
    const eraV = parseFloat(v.probablePitcher?.stats?.[0]?.stats?.era) || 4.50;
    const eraL = parseFloat(l.probablePitcher?.stats?.[0]?.stats?.era) || 4.50;

    let totalRunsV = 0;
    let totalRunsL = 0;
    let winsV = 0;
    const n_sims = 10000;

    for (let i = 0; i < n_sims; i++) {
      // Simulación de Potencial de Carreras (Basado en tu fórmula de xwOBA + Clima)
      // Traducimos el poder ofensivo vs picheo en una proyección de carreras
      const runGenV = (opsV * 5.5 * factorTemp * (1 + (Math.random() - 0.5) * 0.3)) / (eraL * 0.22);
      const runGenL = (opsL * 5.5 * factorTemp * (1 + (Math.random() - 0.5) * 0.3)) / (eraV * 0.22) + 0.3; // +0.3 ventaja local

      totalRunsV += runGenV;
      totalRunsL += runGenL;
      if (runGenV > runGenL) winsV++;
    }

    // Promedios finales (Marcador Proyectado)
    const avgScoreV = Math.round(totalRunsV / n_sims);
    const avgScoreL = Math.round(totalRunsL / n_sims);
    const probV = winsV / n_sims;

    return {
      scoreV: avgScoreV,
      scoreL: avgScoreL,
      ml: probV > 0.5 ? v.team.name : l.team.name,
      confianza: Math.round((probV > 0.5 ? probV : 1 - probV) * 100),
      total: (avgScoreV + avgScoreL > 8.5) ? "OVER 8.5" : "UNDER 8.5",
      rl: (avgScoreV - avgScoreL > 1.5) ? `${v.team.name} -1.5` : (avgScoreL - avgScoreV > 1.5) ? `${l.team.name} -1.5` : "HANDICAP +1.5",
      temp,
      pitcherV: v.probablePitcher?.fullName || "TBD",
      pitcherL: l.probablePitcher?.fullName || "TBD"
    };
  };

  const getLogo = (id) => `https://www.mlbstatic.com/team-logos/${id}.svg`;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 font-sans">
      <header className="text-center py-8">
        <h1 className="text-4xl font-black italic tracking-tighter text-blue-500">QUANTUM PREDICT</h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">Monte Carlo Score Engine</p>
      </header>

      <main className="max-w-xl mx-auto space-y-6">
        {cargando ? (
          <div className="text-center py-20 animate-pulse text-[10px] uppercase font-black">Sincronizando Statcast...</div>
        ) : partidos.map(j => {
          const res = simularPartidoconScore(j);
          return (
            <div key={j.gamePk} className="bg-[#0f0f0f] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
              
              {/* Header con Clima */}
              <div className="px-6 py-2 bg-white/5 flex justify-between items-center">
                <span className="text-[8px] font-black text-slate-500 uppercase">Temp: {res.temp}°C</span>
                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest italic">Live Prediction</span>
              </div>

              {/* Matchup y Marcador Proyectado */}
              <div className="p-8 flex justify-between items-center relative">
                {/* Equipo Visitante */}
                <div className="flex flex-col items-center w-1/3 text-center">
                  <img src={getLogo(j.teams.away.team.id)} className="w-14 h-14 mb-2" />
                  <span className="text-[10px] font-black uppercase leading-tight mb-1">{j.teams.away.team.name}</span>
                  <span className="text-[8px] text-slate-500 italic truncate w-full">{res.pitcherV}</span>
                </div>

                {/* Marcador Central */}
                <div className="flex flex-col items-center justify-center w-1/3">
                  <div className="flex items-center space-x-3">
                    <span className="text-4xl font-black text-white">{res.scoreV}</span>
                    <span className="text-xl font-black text-slate-800">-</span>
                    <span className="text-4xl font-black text-white">{res.scoreL}</span>
                  </div>
                  <span className="text-[7px] font-black text-blue-500 uppercase mt-2 tracking-widest">Score Proyectado</span>
                </div>

                {/* Equipo Local */}
                <div className="flex flex-col items-center w-1/3 text-center">
                  <img src={getLogo(j.teams.home.team.id)} className="w-14 h-14 mb-2" />
                  <span className="text-[10px] font-black uppercase leading-tight mb-1">{j.teams.home.team.name}</span>
                  <span className="text-[8px] text-slate-500 italic truncate w-full">{res.pitcherL}</span>
                </div>
              </div>

              {/* Predicciones */}
              <div className="m-4 bg-blue-600 rounded-[2rem] p-5">
                <div className="flex justify-between items-center mb-4 border-b border-blue-400 pb-2">
                  <span className="text-[10px] font-black uppercase">Veredicto IA</span>
                  <span className="bg-white text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-full">{res.confianza}% Confianza</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-[7px] font-bold text-blue-200 uppercase">Moneyline</p>
                    <p className="text-[10px] font-black text-white truncate">{res.ml}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] font-bold text-blue-200 uppercase">Runline</p>
                    <p className="text-[10px] font-black text-white truncate">{res.rl}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] font-bold text-blue-200 uppercase">Totals</p>
                    <p className="text-[10px] font-black text-white truncate">{res.total}</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </main>
    </div>
  );
}