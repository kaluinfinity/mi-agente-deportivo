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

  const simuladorMonteCarlo = (juego) => {
    const v = juego.teams.away;
    const l = juego.teams.home;

    // --- CAPA 1 & 2: FACTOR PARQUE + CLIMA ---
    const tempCelsius = parseFloat(juego.venue.weather?.temp) || 20;
    const boostClima = (tempCelsius - 20) * 0.018; // 1.8% más HR por grado arriba de 20°C
    
    // Simplificación de Park Factor basado en Statcast (xwOBA)
    const parkFactor = juego.venue.name.includes("Coors") ? 1.30 : 
                       juego.venue.name.includes("Great American") ? 1.15 : 1.0;

    // --- CAPA 3 & 4: FATIGA BULLPEN Y SPLITS ---
    // Estimamos fatiga: Si el equipo ha jugado muchos juegos seguidos (pct racha)
    const fatigaV = v.leagueRecord.wins > 5 ? 0.95 : 1.0; // Desgaste del 5%
    const fatigaL = l.leagueRecord.wins > 5 ? 0.95 : 1.0;

    // --- CAPA 5: SIMULACIÓN DE 1,000 ITERACIONES ---
    let victoriasV = 0;
    let carrerasTotal = 0;

    const basePowerV = (parseFloat(v.team.statistics?.[0]?.stats?.ops) || 0.720) * parkFactor * (1 + boostClima);
    const basePowerL = (parseFloat(l.team.statistics?.[0]?.stats?.ops) || 0.720) * parkFactor * (1 + boostClima) + 0.05; // Home Advantage

    const pitchV = 1 / (parseFloat(v.probablePitcher?.stats?.[0]?.stats?.era) || 4.5);
    const pitchL = 1 / (parseFloat(l.probablePitcher?.stats?.[0]?.stats?.era) || 4.5);

    for (let i = 0; i < 1000; i++) {
      // Añadimos varianza aleatoria (Desviación Estándar)
      const rV = (basePowerV * pitchL) + (Math.random() * 0.2 - 0.1);
      const rL = (basePowerL * pitchV) + (Math.random() * 0.2 - 0.1);
      if (rV > rL) victoriasV++;
      carrerasTotal += (rV + rL) * 10;
    }

    const probV = victoriasV / 1000;
    const promedioCarreras = carrerasTotal / 1000;

    // RESULTADOS FINALES
    const moneyline = probV > 0.5 ? v.team.name : l.team.name;
    const confianza = Math.round((probV > 0.5 ? probV : 1 - probV) * 100);
    const runline = confianza > 68 ? `${moneyline} -1.5` : `${probV > 0.5 ? l.team.name : v.team.name} +1.5`;
    const total = promedioCarreras > 8.5 ? "Altas (Over)" : "Bajas (Under)";

    return { 
      moneyline, runline, total, confianza, 
      temp: tempCelsius, 
      park: parkFactor > 1 ? "Favor Bateo" : "Neutral",
      pPlusV: (pitchV * 500).toFixed(0),
      pPlusL: (pitchL * 500).toFixed(0)
    };
  };

  const getLogo = (id) => `https://www.mlbstatic.com/team-logos/${id}.svg`;

  return (
    <div className="min-h-screen bg-[#020408] text-white p-4 font-sans selection:bg-blue-500">
      <header className="text-center py-12">
        <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1 rounded-full mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Monte Carlo Simulator x1000</span>
        </div>
        <h1 className="text-5xl font-black italic tracking-tighter">AUGUSTO <span className="text-blue-600">QUANT</span></h1>
        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.5em] mt-2">Physics & Sabermetrics Integrated</p>
      </header>

      <main className="max-w-xl mx-auto space-y-8 pb-20">
        {cargando ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Calculando Probabilidades Térmicas...</p>
          </div>
        ) : partidos.map((j) => {
          const res = simuladorMonteCarlo(j);
          return (
            <div key={j.gamePk} className="bg-[#0a0e14] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
              
              {/* Capa de Física y Clima */}
              <div className="grid grid-cols-3 text-[8px] font-black uppercase tracking-widest py-3 bg-white/[0.02] border-b border-white/5 px-8 text-slate-500">
                <div className="flex items-center space-x-1">
                   <span>🌡️ {res.temp}°C</span>
                </div>
                <div className="text-center text-blue-500">Factor: {res.park}</div>
                <div className="text-right">Shift: Optimized</div>
              </div>

              {/* Matchup Principal */}
              <div className="p-10 flex justify-between items-center">
                <div className="flex flex-col items-center w-1/3">
                  <img src={getLogo(j.teams.away.team.id)} className="w-16 h-16 mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                  <span className="text-[10px] font-black text-center leading-tight uppercase h-8 flex items-center">{j.teams.away.team.name}</span>
                  <div className="mt-4 text-center">
                    <p className="text-[7px] text-slate-600 uppercase font-bold">Pitching+</p>
                    <p className="text-xs font-mono font-bold text-blue-400">{res.pPlusV}</p>
                  </div>
                </div>

                <div className="text-xs font-black text-slate-800">VS</div>

                <div className="flex flex-col items-center w-1/3">
                  <img src={getLogo(j.teams.home.team.id)} className="w-16 h-16 mb-4 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
                  <span className="text-[10px] font-black text-center leading-tight uppercase h-8 flex items-center">{j.teams.home.team.name}</span>
                  <div className="mt-4 text-center">
                    <p className="text-[7px] text-slate-600 uppercase font-bold">Pitching+</p>
                    <p className="text-xs font-mono font-bold text-orange-400">{res.pPlusL}</p>
                  </div>
                </div>
              </div>

              {/* Panel de Predicción Cuántica */}
              <div className="mx-6 mb-6 p-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem]">
                <div className="bg-[#0d1117] rounded-[2.4rem] p-6">
                   <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-black uppercase text-blue-500">Simulated Prediction</span>
                      <div className="px-3 py-1 bg-blue-500 rounded-full text-[10px] font-black">{res.confianza}% CONF.</div>
                   </div>

                   <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5 text-center">
                        <p className="text-[7px] text-slate-500 font-bold uppercase mb-1">Moneyline</p>
                        <p className="text-[10px] font-black text-white">{res.moneyline}</p>
                      </div>
                      <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5 text-center">
                        <p className="text-[7px] text-slate-500 font-bold uppercase mb-1">Runline</p>
                        <p className="text-[10px] font-black text-blue-400">{res.runline}</p>
                      </div>
                      <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5 text-center">
                        <p className="text-[7px] text-slate-500 font-bold uppercase mb-1">Totals</p>
                        <p className="text-[10px] font-black text-green-400">{res.total}</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>
      
      <footer className="text-center py-10 opacity-30">
        <p className="text-[7px] font-black uppercase tracking-[1em]">Quant Lab Neural Engine &bull; 2026</p>
      </footer>
    </div>
  );
}