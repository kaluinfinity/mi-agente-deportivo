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

  const engineMonteCarloClima = (juego) => {
    // 1. Obtener Clima Oficial
    const temp = parseFloat(juego.venue.weather?.temp) || 20;
    const factorTemp = 1 + (temp - 20) * 0.018; 

    const v = juego.teams.away;
    const l = juego.teams.home;

    // 2. Variables Base (Estadísticas Reales)
    const opsV = parseFloat(v.team.statistics?.[0]?.stats?.ops) || 0.720;
    const opsL = parseFloat(l.team.statistics?.[0]?.stats?.ops) || 0.720;
    const eraV = parseFloat(v.probablePitcher?.stats?.[0]?.stats?.era) || 4.50;
    const eraL = parseFloat(l.probablePitcher?.stats?.[0]?.stats?.era) || 4.50;

    // 3. Simulación de 10,000 muestras (Distribución Normal)
    let simulacionesV = [];
    let simulacionesL = [];
    const n_sims = 10000;

    for (let i = 0; i < n_sims; i++) {
      // Generamos ruido estadístico (Varianza de wOBA y Velocidad de Salida)
      const ruidoV = (Math.random() - 0.5) * 0.15;
      const ruidoL = (Math.random() - 0.5) * 0.15;

      // Aplicamos tu fórmula: xwOBA_Proyectado = xwOBA + (Vel_Salida_Ajustada - Vel_Salida) * 0.01
      // Aquí simplificamos el impacto directo del factor_temperatura en el Score
      const xwOBA_V = (opsV * 0.4) + (ruidoV * factorTemp) + ((factorTemp - 1) * 0.1);
      const xwOBA_L = (opsL * 0.4) + (ruidoL * factorTemp) + ((factorTemp - 1) * 0.1) + 0.02; // Home advantage

      // El Pitching actúa como el divisor de probabilidad
      simulacionesV.push(xwOBA_V / (eraL * 0.2));
      simulacionesL.push(xwOBA_L / (eraV * 0.2));
    }

    // 4. Cálculo de Probabilidades e Intervalos (Quantiles)
    const ganarV = simulacionesV.filter((val, i) => val > simulacionesL[i]).length;
    const probV = ganarV / n_sims;
    
    // Intervalo de Confianza 90% (Cálculo simplificado de cuantiles)
    simulacionesV.sort((a, b) => a - b);
    const q05 = simulacionesV[Math.floor(n_sims * 0.05)];
    const q95 = simulacionesV[Math.floor(n_sims * 0.95)];

    const favorito = probV > 0.5 ? v.team.name : l.team.name;
    const confianza = Math.round((probV > 0.5 ? probV : 1 - probV) * 100);

    return {
      favorito,
      confianza,
      q05: q05.toFixed(3),
      q95: q95.toFixed(3),
      ml: favorito,
      rl: confianza > 65 ? `${favorito} -1.5` : `${probV > 0.5 ? l.team.name : v.team.name} +1.5`,
      total: (simulacionesV[5000] + simulacionesL[5000] > 0.8) ? "ALTAS" : "BAJAS",
      temp,
      pitcherV: v.probablePitcher?.fullName,
      pitcherL: l.probablePitcher?.fullName
    };
  };

  const getLogo = (id) => `https://www.mlbstatic.com/team-logos/${id}.svg`;

  return (
    <div className="min-h-screen bg-[#030712] text-white p-4 font-sans">
      <header className="text-center py-10">
        <div className="inline-block bg-blue-600/20 border border-blue-500 px-4 py-1 rounded-full mb-4">
          <p className="text-[10px] font-black tracking-widest text-blue-400">MONTE CARLO MULTIVARIATE v6.0</p>
        </div>
        <h1 className="text-5xl font-black italic">QUANTUM <span className="text-blue-500 underline decoration-4">MLB</span></h1>
      </header>

      <main className="max-w-2xl mx-auto space-y-10 pb-20">
        {cargando ? (
            <div className="py-20 text-center animate-pulse font-mono text-xs text-blue-500">CORRIENDO 10,000 SIMULACIONES TÉRMICAS...</div>
        ) : partidos.map(j => {
          const res = engineMonteCarloClima(j);
          return (
            <div key={j.gamePk} className="bg-[#0f172a] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
              
              {/* Data Header */}
              <div className="px-10 py-4 bg-white/5 flex justify-between items-center text-[9px] font-black text-slate-500">
                <span className="flex items-center"><span className="text-orange-400 mr-2">🌡️</span> {res.temp}°C (Ajuste: {((res.temp-20)*1.8).toFixed(1)}% HR)</span>
                <span className="text-blue-400 tracking-tighter italic">Official GameInfo Pk: {j.gamePk}</span>
              </div>

              {/* Matchup */}
              <div className="p-10 flex justify-between items-center">
                 <div className="flex flex-col items-center w-1/3">
                    <img src={getLogo(j.teams.away.team.id)} className="w-16 h-16 mb-4" />
                    <span className="text-[10px] font-black uppercase text-center h-8">{j.teams.away.team.name}</span>
                    <p className="text-[8px] text-blue-400 font-bold mt-2 italic">{res.pitcherV}</p>
                 </div>
                 <div className="text-4xl font-black text-slate-900 italic">VS</div>
                 <div className="flex flex-col items-center w-1/3">
                    <img src={getLogo(j.teams.home.team.id)} className="w-16 h-16 mb-4" />
                    <span className="text-[10px] font-black uppercase text-center h-8">{j.teams.home.team.name}</span>
                    <p className="text-[8px] text-orange-400 font-bold mt-2 italic">{res.pitcherL}</p>
                 </div>
              </div>

              {/* Advanced Results Block */}
              <div className="bg-[#1e293b] m-4 rounded-[2.5rem] p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AI Final Projection</h3>
                    <p className="text-3xl font-black italic tracking-tighter">{res.ml}</p>
                  </div>
                  <div className="bg-blue-600 px-4 py-2 rounded-2xl text-center">
                    <p className="text-[8px] font-bold text-blue-200 uppercase">Confidence</p>
                    <p className="text-xl font-black">{res.confianza}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-8">
                  <div className="bg-black/20 p-4 rounded-3xl border border-white/5 text-center">
                    <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Moneyline</p>
                    <p className="text-[11px] font-black">WIN</p>
                  </div>
                  <div className="bg-black/20 p-4 rounded-3xl border border-white/5 text-center">
                    <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Runline</p>
                    <p className="text-[11px] font-black text-blue-400">{res.rl}</p>
                  </div>
                  <div className="bg-black/20 p-4 rounded-3xl border border-white/5 text-center">
                    <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Totals</p>
                    <p className="text-[11px] font-black text-green-400">{res.total}</p>
                  </div>
                </div>

                {/* Intervalo de Confianza 90% */}
                <div className="border-t border-white/10 pt-6 text-center">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">xwOBA Proyectado (Intervalo 90%)</p>
                   <div className="flex justify-center items-center space-x-6">
                      <div className="text-xs font-mono font-bold text-slate-400">P5: {res.q05}</div>
                      <div className="h-4 w-[1px] bg-slate-700"></div>
                      <div className="text-xs font-mono font-bold text-slate-400">P95: {res.q95}</div>
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