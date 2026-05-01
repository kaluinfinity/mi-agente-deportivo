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

  const calcularModeloAvanzado = (juego) => {
    const v = juego.teams.away;
    const l = juego.teams.home;

    // 1. ANALISIS DE PITCHEO (ERA)
    const eraV = parseFloat(v.probablePitcher?.stats?.find(s => s.group.displayName === 'pitching')?.stats?.era) || 4.50;
    const eraL = parseFloat(l.probablePitcher?.stats?.find(s => s.group.displayName === 'pitching')?.stats?.era) || 4.50;

    // 2. ANALISIS DE OFENSIVA (OPS - La estadística reina de la sabermetría)
    // El OPS combina llegar a base y batear con fuerza.
    const opsV = parseFloat(v.team.statistics?.find(s => s.group.displayName === 'hitting')?.stats?.ops) || 0.720;
    const opsL = parseFloat(l.team.statistics?.find(s => s.group.displayName === 'hitting')?.stats?.ops) || 0.720;

    // 3. FACTOR RACHA (Tendencia)
    const rachaV = v.leagueRecord.pct; 
    const rachaL = l.leagueRecord.pct;

    // MODELO MATEMÁTICO: (Poder Ofensivo * 100) - (ERA * 10) + (Récord * 50)
    const powerV = (opsV * 150) - (eraV * 8) + (rachaV * 40);
    const powerL = (opsL * 150) - (eraL * 8) + (rachaL * 40) + 3; // +3 Home Advantage

    const favorito = powerV > powerL ? v.team.name : l.team.name;
    const confianza = Math.min(Math.round(50 + Math.abs(powerV - powerL)), 98);

    // ANALISIS H2H / TOTALES
    const totalSugerido = (opsV + opsL > 1.50) ? "ALTAS (Ofensiva Explosiva)" : "BAJAS (Duelo Táctico)";
    const tendencia = (opsV > opsL) ? `${v.team.name} tiene mejor bateo` : `${l.team.name} domina en el plato`;

    return { favorito, confianza, totalSugerido, tendencia, opsV, opsL, eraV, eraL };
  };

  const getLogoUrl = (teamId) => `https://www.mlbstatic.com/team-logos/${teamId}.svg`;

  return (
    <div className="flex flex-col items-center min-h-screen bg-black text-white p-4 font-sans">
      <header className="text-center my-10">
        <div className="inline-block bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black tracking-tighter mb-2">SABERMETRICS ENGINE v3.0</div>
        <h1 className="text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">PRO ANALYST</h1>
      </header>

      <main className="w-full max-w-xl space-y-10">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20 text-blue-500">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-mono text-xs uppercase">Calculando OPS y Proyecciones...</p>
          </div>
        ) : partidos.map((juego) => {
          const mod = calcularModeloAvanzado(juego);
          return (
            <div key={juego.gamePk} className="bg-neutral-900 rounded-[3rem] border border-neutral-800 shadow-2xl overflow-hidden">
              {/* Top Bar */}
              <div className="px-8 py-4 bg-white/5 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{juego.venue.name}</span>
                <span className="text-green-500 text-[10px] font-black uppercase">Head-to-Head Analysis</span>
              </div>

              {/* Comparativa Sabermétrica */}
              <div className="p-8">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex flex-col items-center w-1/3 text-center">
                    <img src={getLogoUrl(juego.teams.away.team.id)} className="w-20 h-20 mb-4 shadow-xl" />
                    <span className="text-xs font-black uppercase">{juego.teams.away.team.name}</span>
                  </div>
                  <div className="w-1/3 flex flex-col items-center">
                    <span className="text-4xl font-black text-neutral-800">VS</span>
                  </div>
                  <div className="flex flex-col items-center w-1/3 text-center">
                    <img src={getLogoUrl(juego.teams.home.team.id)} className="w-20 h-20 mb-4 shadow-xl" />
                    <span className="text-xs font-black uppercase">{juego.teams.home.team.name}</span>
                  </div>
                </div>

                {/* Tabla de Estadísticas Reales */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold border-y border-white/5 py-4 mb-6">
                  <div className="text-blue-400">{mod.opsV.toFixed(3)} <br/> <span className="text-slate-600 font-normal">TEAM OPS</span></div>
                  <div className="text-slate-500 self-center">MÉTRICAS</div>
                  <div className="text-orange-400">{mod.opsL.toFixed(3)} <br/> <span className="text-slate-600 font-normal">TEAM OPS</span></div>
                  
                  <div className="text-blue-400">{mod.eraV.toFixed(2)} <br/> <span className="text-slate-600 font-normal">ERA PITCHER</span></div>
                  <div className="text-slate-500 self-center">DUELO</div>
                  <div className="text-orange-400">{mod.eraL.toFixed(2)} <br/> <span className="text-slate-600 font-normal">ERA PITCHER</span></div>
                </div>

                {/* Panel de Predicción */}
                <div className="bg-blue-600 rounded-[2rem] p-6 text-white shadow-lg shadow-blue-900/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black uppercase tracking-widest">IA Top Pick</span>
                    <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-black">{mod.confianza}%</span>
                  </div>
                  <p className="text-2xl font-black mb-1 uppercase tracking-tighter italic">{mod.favorito}</p>
                  <p className="text-[10px] font-medium text-blue-100 opacity-80 uppercase leading-relaxed">
                    {mod.tendencia}. Proyección de mercado: {mod.totalSugerido}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </main>
      <footer className="py-20 text-[8px] text-neutral-700 font-black tracking-[0.5em] uppercase">Neural Lab &copy; 2026</footer>
    </div>
  );
}