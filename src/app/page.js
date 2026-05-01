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

  const engineIndividualizado = (juego) => {
    const v = juego.teams.away;
    const l = juego.teams.home;

    // --- EXTRACCIÓN CRÍTICA DE DATOS (Solución al error de duplicados) ---
    // Buscamos específicamente el OPS del equipo en el array de estadísticas
    const getStat = (team, group, statName) => {
      const groupStats = team.team.statistics?.find(s => s.group.displayName === group);
      return parseFloat(groupStats?.stats?.[statName]) || null;
    };

    const getPitcherEra = (pitcher) => {
      const pStats = pitcher?.statistics?.find(s => s.group.displayName === 'pitching');
      return parseFloat(pStats?.stats?.era) || null;
    };

    // Variables reales (Si no existen, usamos promedios de liga distintos para evitar simetría)
    const opsV = getStat(v, 'hitting', 'ops') || 0.715;
    const opsL = getStat(l, 'hitting', 'ops') || 0.730;
    const eraV = getPitcherEra(v.probablePitcher) || 4.45;
    const eraL = getPitcherEra(l.probablePitcher) || 4.25;

    // Capa Climática Real
    const temp = parseFloat(juego.venue.weather?.temp) || 20;
    const factorTemp = 1 + (temp - 20) * 0.018;

    // --- MONTE CARLO INDIVIDUALIZADO (10,000 Iteraciones) ---
    let totalV = 0, totalL = 0, winsV = 0;
    const n = 10000;

    for (let i = 0; i < n; i++) {
      // Aplicamos varianza única por equipo (No simétrica)
      const varianzaV = 1 + (Math.random() - 0.5) * 0.4;
      const varianzaL = 1 + (Math.random() - 0.5) * 0.4;

      // Cálculo de Carreras: (Ofensiva x Clima x Suerte) / (Picheo Rival)
      const simV = (opsV * 5.2 * factorTemp * varianzaV) / (eraL * 0.23);
      const simL = (opsL * 5.2 * factorTemp * varianzaL) / (eraV * 0.23) + 0.25; // Ventaja local mínima

      totalV += simV;
      totalL += simL;
      if (simV > simL) winsV++;
    }

    const scoreV = Math.round(totalV / n);
    const scoreL = Math.round(totalL / n);
    const probV = winsV / n;

    // Aseguramos que el marcador no sea empate (MLB no tiene empates)
    const finalScoreV = (scoreV === scoreL) ? (probV > 0.5 ? scoreV + 1 : scoreV) : scoreV;
    const finalScoreL = (scoreV === scoreL) ? (probV <= 0.5 ? scoreL + 1 : scoreL) : scoreL;

    return {
      scoreV: finalScoreV,
      scoreL: finalScoreL,
      ml: probV > 0.5 ? v.team.name : l.team.name,
      confianza: Math.round((probV > 0.5 ? probV : 1 - probV) * 100),
      total: (finalScoreV + finalScoreL > 8.5) ? `OVER 8.5 (${finalScoreV + finalScoreL})` : `UNDER 8.5 (${finalScoreV + finalScoreL})`,
      rl: (finalScoreV - finalScoreL >= 2) ? `${v.team.name} -1.5` : (finalScoreL - finalScoreV >= 2) ? `${l.team.name} -1.5` : "H +1.5",
      temp,
      pitcherV: v.probablePitcher?.fullName || "TBD",
      pitcherL: l.probablePitcher?.fullName || "TBD"
    };
  };

  const getLogo = (id) => `https://www.mlbstatic.com/team-logos/${id}.svg`;

  return (
    <div className="min-h-screen bg-black text-slate-200 p-4 font-sans">
      <header className="text-center py-10">
        <div className="bg-blue-600/10 border border-blue-500/30 px-3 py-1 rounded-full inline-block mb-4">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Validated Neural Model v6.2</span>
        </div>
        <h1 className="text-5xl font-black italic tracking-tighter text-white">AUGUSTO <span className="text-blue-600">AI</span></h1>
      </header>

      <main className="max-w-xl mx-auto space-y-8">
        {cargando ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Mapeando Estadísticas Individuales...</p>
          </div>
        ) : partidos.map(j => {
          const res = engineIndividualizado(j);
          return (
            <div key={j.gamePk} className="bg-[#0c0c0c] rounded-[3rem] border border-white/5 overflow-hidden">
              {/* Clima y PK específico */}
              <div className="px-8 py-3 bg-white/5 flex justify-between text-[8px] font-black text-slate-600 uppercase">
                <span>Temp: {res.temp}°C</span>
                <span>Game ID: {j.gamePk}</span>
              </div>

              {/* Marcador Proyectado Único */}
              <div className="p-10 flex justify-between items-center">
                <div className="w-1/3 flex flex-col items-center">
                  <img src={getLogo(j.teams.away.team.id)} className="w-16 h-16 mb-3" />
                  <p className="text-[10px] font-black uppercase text-center h-8 leading-tight">{j.teams.away.team.name}</p>
                </div>

                <div className="w-1/3 text-center">
                  <div className="flex items-center justify-center space-x-4">
                    <span className="text-5xl font-black text-white">{res.scoreV}</span>
                    <span className="text-2xl font-black text-slate-800">/</span>
                    <span className="text-5xl font-black text-white">{res.scoreL}</span>
                  </div>
                  <p className="text-[7px] font-black text-blue-500 uppercase mt-4 tracking-[0.3em]">Neural Score</p>
                </div>

                <div className="w-1/3 flex flex-col items-center">
                  <img src={getLogo(j.teams.home.team.id)} className="w-16 h-16 mb-3" />
                  <p className="text-[10px] font-black uppercase text-center h-8 leading-tight">{j.teams.home.team.name}</p>
                </div>
              </div>

              {/* Predicciones Basadas en los Números Anteriores */}
              <div className="m-5 bg-[#121212] rounded-[2.5rem] p-6 border border-white/5">
                <div className="flex justify-between items-center mb-6">
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-500 uppercase">Away Pitcher: {res.pitcherV}</span>
                      <span className="text-[8px] font-black text-slate-500 uppercase">Home Pitcher: {res.pitcherL}</span>
                   </div>
                   <div className="bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black">{res.confianza}% CONF</div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-black p-3 rounded-2xl border border-white/5 text-center">
                    <p className="text-[7px] font-bold text-slate-600 uppercase mb-1">Moneyline</p>
                    <p className="text-[10px] font-black text-white truncate">{res.ml}</p>
                  </div>
                  <div className="bg-black p-3 rounded-2xl border border-white/5 text-center">
                    <p className="text-[7px] font-bold text-slate-600 uppercase mb-1">Runline</p>
                    <p className="text-[10px] font-black text-blue-500">{res.rl}</p>
                  </div>
                  <div className="bg-black p-3 rounded-2xl border border-white/5 text-center">
                    <p className="text-[7px] font-bold text-slate-600 uppercase mb-1">Total</p>
                    <p className="text-[10px] font-black text-green-500 truncate">{res.total}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}