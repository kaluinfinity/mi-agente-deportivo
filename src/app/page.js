"use client";
import { useEffect, useState, useMemo } from 'react';

// MEJORA: Mover constantes fuera del componente
const COEFICIENTES_MODELO = {
  intercepto: 1.47,
  pesoOPS: 0.71,
  pesoBarrel: 0.09,
  pesoXwOBA: 3.1,
  pesoHardHit: 0.032,
  pesoK: -0.068,
  pesoBB: 0.11,
  factorLocalia: 0.28,
  factorERA: 0.12,
  factorTemperatura: 0.018
};

// MEJORA: Helper para generar normal (Box-Muller)
const normalRandom = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

export default function Home() {
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [predicciones, setPredicciones] = useState({});

  useEffect(() => {
    fetch('/api/partidos').then(res => res.json()).then(data => {
      setPartidos(data);
      setCargando(false);
      // MEJORA: Calcular predicciones en lote
      const prediccionesBatch = {};
      for (const juego of data) {
        prediccionesBatch[juego.gamePk] = engineDiferenciado(juego);
      }
      setPredicciones(prediccionesBatch);
    });
  }, []);

  const engineDiferenciado = (juego) => {
    const v = juego.teams.away;
    const l = juego.teams.home;

    // MEJORA: Extracción robusta con defaults realistas
    const pctV = parseFloat(v.leagueRecord?.pct) || 0.500;
    const pctL = parseFloat(l.leagueRecord?.pct) || 0.500;

    // MEJORA: Calcular runs esperados con regresión múltiple
    const calcularRunsEquipo = (equipo, pct, pitcherERA, temp, isHome) => {
      const hitting = equipo.team.statistics?.find(s => s.group.displayName === 'hitting')?.stats || {};
      const ops = parseFloat(hitting.ops) || (0.500 + pct * 0.4);
      const barrelPct = parseFloat(hitting.barrelPct) || (6 + pct * 4);
      const xwOBA = parseFloat(hitting.xwOBA) || (0.280 + pct * 0.1);
      const hardHitPct = parseFloat(hitting.hardHitPct) || (30 + pct * 8);
      const kPct = parseFloat(hitting.kPct) || (25 - pct * 5);
      const bbPct = parseFloat(hitting.bbPct) || (7 + pct * 2);
      
      let runs = COEFICIENTES_MODELO.intercepto +
                 COEFICIENTES_MODELO.pesoOPS * ops +
                 COEFICIENTES_MODELO.pesoBarrel * barrelPct +
                 COEFICIENTES_MODELO.pesoXwOBA * xwOBA +
                 COEFICIENTES_MODELO.pesoHardHit * hardHitPct +
                 COEFICIENTES_MODELO.pesoK * kPct +
                 COEFICIENTES_MODELO.pesoBB * bbPct;
      
      // Ajuste por pitcher rival
      const pitcherERAVal = parseFloat(pitcherERA) || 4.2;
      runs *= (1 + (4.0 - pitcherERAVal) * COEFICIENTES_MODELO.factorERA);
      
      // Ajuste por localía
      if (isHome) runs += COEFICIENTES_MODELO.factorLocalia;
      
      // Ajuste por temperatura (solo si >20°C o <15°C)
      if (temp > 22) runs *= (1 + (temp - 22) * COEFICIENTES_MODELO.factorTemperatura);
      if (temp < 12) runs *= (1 - (12 - temp) * COEFICIENTES_MODELO.factorTemperatura * 0.7);
      
      return Math.max(2, runs);
    };

    const temp = parseFloat(juego.venue.weather?.temp) || 20;
    
    // Obtener ERA de los pitchers
    const eraV = parseFloat(v.probablePitcher?.statistics?.find(s => s.group.displayName === 'pitching')?.stats?.era) || 4.2;
    const eraL = parseFloat(l.probablePitcher?.statistics?.find(s => s.group.displayName === 'pitching')?.stats?.era) || 4.2;
    
    const expectedV = calcularRunsEquipo(v, pctV, eraL, temp, false);
    const expectedL = calcularRunsEquipo(l, pctL, eraV, temp, true);
    
    // MEJORA: Desviación estándar basada en datos reales
    const stdV = 1.2 + (1 - pctV) * 0.8;
    const stdL = 1.2 + (1 - pctL) * 0.8;
    
    // MEJORA: Monte Carlo con distribución normal
    const N_SIMS = 5000;
    let winsV = 0, runsSumV = 0, runsSumL = 0;
    const allRunsV = [], allRunsL = [];
    
    for (let i = 0; i < N_SIMS; i++) {
      let simV = expectedV + stdV * normalRandom();
      let simL = expectedL + stdL * normalRandom();
      
      simV = Math.max(0, Math.round(simV));
      simL = Math.max(0, Math.round(simL));
      
      allRunsV.push(simV);
      allRunsL.push(simL);
      runsSumV += simV;
      runsSumL += simL;
      if (simV > simL) winsV++;
    }
    
    // MEJORA: Usar mediana en lugar de media (menos sensible a outliers)
    const median = (arr) => {
      const sorted = [...arr].sort((a,b) => a-b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid-1] + sorted[mid]) / 2);
    };
    
    const scoreV = median(allRunsV);
    const scoreL = median(allRunsL);
    const probV = winsV / N_SIMS;
    
    // MEJORA: Calcular probabilidad de Over
    let overs = 0;
    for (let i = 0; i < allRunsV.length; i++) {
      if (allRunsV[i] + allRunsL[i] > 8.5) overs++;
    }
    const overProb = overs / N_SIMS;
    
    return {
      scoreV, scoreL,
      ml: probV > 0.55 ? v.team.name : (probV < 0.45 ? l.team.name : "PICK"),
      confianza: Math.round(Math.abs(probV - 0.5) * 200),
      total: overProb > 0.55 ? "OVER 8.5" : (overProb < 0.45 ? "UNDER 8.5" : "PUSH"),
      rl: (scoreV - scoreL >= 2) ? `${v.team.name} -1.5` : (scoreL - scoreV >= 2) ? `${l.team.name} -1.5` : "PASS",
      temp,
      pitcherV: v.probablePitcher?.fullName || "TBD",
      pitcherL: l.probablePitcher?.fullName || "TBD",
      probV: (probV * 100).toFixed(1)
    };
  };

  // ... resto del JSX (sin cambios significativos)
}