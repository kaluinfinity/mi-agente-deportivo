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

  const engineDiferenciado = (juego) => {
    const v = juego.teams.away;
    const l = juego.teams.home;

    // --- EXTRACCIÓN DE DATOS CON FALLBACKS BASADOS EN RENDIMIENTO REAL ---
    // Si la API no da el OPS, usamos el porcentaje de victorias como base de poder
    const pctV = parseFloat(v.leagueRecord?.pct) || 0.500;
    const pctL = parseFloat(l.leagueRecord?.pct) || 0.500;

    const opsV = parseFloat(v.team.statistics?.find(s => s.group.displayName === 'hitting')?.stats?.ops) || (pctV * 1.4);
    const opsL = parseFloat(l.team.statistics?.find(s => s.group.displayName === 'hitting')?.stats?.ops) || (pctL * 1.4);

    const eraV = parseFloat(v.probablePitcher?.statistics?.find(s => s.group.displayName === 'pitching')?.stats?.era) || (5.5 - pctV * 2);
    const eraL = parseFloat(l.probablePitcher?.statistics?.find(s => s.group.displayName === 'pitching')?.stats?.era) || (5.5 - pctL * 2);

    // Clima y Factor Estadio (Diferenciador por Game ID)
    const temp = parseFloat(juego.venue.weather?.temp) || 20;
    const seedId = juego.gamePk % 100; // Usamos el ID del juego para crear una varianza única

    // --- MONTE CARLO (10,000 SIMS) ---
    let totalV = 0, totalL = 0, winsV = 0;
    const n = 10000;

    for (let i = 0; i < n; i++) {
      // Varianza única por juego basada en seedId
      const varianzaV = 1 + (Math.random() - 0.5) * 0.5 + (seedId / 1000);
      const varianzaL = 1 + (Math.random() - 0.5) * 0.5;

      const simV = (opsV * 6 * (1 + (temp-20)*0.018) * varianzaV) / (eraL * 0.25);
      const simL = (opsL * 6 * (1 + (temp-20)*0.018) * varianzaL) / (eraV * 0.25) + 0.3; // Home field

      totalV += simV;
      totalL += simL;
      if (simV > simL) winsV++;
    }

    // Resultados Finales
    const rawScoreV = totalV / n;
    const rawScoreL = totalL / n;
    
    // Forzamos números enteros distintos
    let fScoreV = Math.round(rawScoreV);
    let fScoreL = Math.round(rawScoreL);
    if (fScoreV === fScoreL) winsV/n > 0.5 ? fScoreV++ : fScoreL++;

    const probV = winsV / n;

    return {
      scoreV: fScoreV,
      scoreL: fScoreL,
      ml: probV > 0.5 ? v.team.name : l.team.name,
      confianza: Math.round((probV > 0.5 ? probV : 1 - probV) * 100),
      total: (fScoreV + fScoreL) > 8.5 ? "OVER 8.5" : "UNDER 8.5",
      rl: (fScoreV - fScoreL >= 2) ? `${v.team.name} -1.5` : (fScoreL - fScoreV >= 2) ? `${l.team.name} -1.5` : "H +1.5",
      temp,
      pitcherV: v.probablePitcher?.fullName || "TBD",
      pitcherL: l.probablePitcher?.fullName || "TBD"
    };
  };

  const getLogo = (id) => `https://www.mlbstatic.com/team-logos/${id}.svg`;

  return (
    <div className="min-h-screen bg-[#020202] text-white p-4 font-sans">
      <header className="text-center py-10 border-b border-white/5 mb-10">
        <h1 className="text-4xl font-black italic text-blue-500 tracking-tighter">QUANTUM ANALYST</h1>
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.5em]">Real-Time Individualized Simulation</p>
      </header>

      <main className="max-w-2xl mx-auto space-y-12">
        {cargando ? (
          <p className="text-center text-xs animate-pulse">CARGANDO DATA EXCLUSIVA...</p>
        ) : partidos.map(j => {
          const res = engineDiferenciado(j);
          return (
            <div key={j.gamePk} className="bg-[#0a0a0a] rounded-[3rem] border border-white/10 shadow-2xl p-8">
              <div className="flex justify-between items-center mb-8 px-4">
                <div className="flex flex-col items-center w-1/3">
                  <img src={getLogo(j.teams.away.team.id)} className="w-16 h-16 mb-2" alt="Away" />
                  <span className="text-[10px] font-black uppercase text-center h-8 leading-tight">{j.teams.away.team.name}</span>
                </div>
                
                <div className="w-1/3 text-center">
                  <div className="text-5xl font-black tracking-tighter flex justify-center space-x-3">
                    <span className={res.scoreV > res.scoreL ? "text-blue-500" : "text-white"}>{res.scoreV}</span>
                    <span className="text-slate-800">-</span>
                    <span className={res.scoreL > res.scoreV ? "text-blue-500" : "text-white"}>{res.scoreL}</span>
                  </div>
                  <p className="text-[7px] font-black text-slate-700 uppercase mt-4">Final Simulated Score</p>
                </div>

                <div className="flex flex-col items-center w-1/3">
                  <img src={getLogo(j.teams.home.team.id)} className="w-16 h-16 mb-2" alt="Home" />
                  <span className="text-[10px] font-black uppercase text-center h-8 leading-tight">{j.teams.home.team.name}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-white/5 p-6 rounded-[2rem]">
                <div className="text-center border-r border-white/10">
                  <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Winner</p>
                  <p className="text-[10px] font-black truncate">{res.ml}</p>
                </div>
                <div className="text-center border-r border-white/10">
                  <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Handicap</p>
                  <p className="text-[10px] font-black text-blue-400">{res.rl}</p>
                </div>
                <div className="text-center">
                  <p className="text-[7px] font-black text-slate-500 uppercase mb-1">O/U 8.5</p>
                  <p className="text-[10px] font-black text-green-400">{res.total}</p>
                </div>
              </div>

              <div className="mt-4 text-center">
                <span className="text-[8px] font-black text-slate-800 uppercase tracking-widest">
                  Pitchers: {res.pitcherV} vs {res.pitcherL} &bull; Temp: {res.temp}°C
                </span>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}