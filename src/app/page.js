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
      });
  }, []);

  // Función para decidir quién es el favorito estadístico
  const obtenerPrediccion = (juego) => {
    const recordVisitante = juego.teams.away.leagueRecord;
    const recordLocal = juego.teams.home.leagueRecord;
    
    const pctVisitante = parseFloat(recordVisitante.pct);
    const pctLocal = parseFloat(recordLocal.pct);

    // Calculamos una confianza basada en la diferencia de récords
    // Si un equipo tiene .600 y otro .400, la confianza es mayor
    const total = pctVisitante + pctLocal;
    const confianzaLocal = Math.round((pctLocal / total) * 100);
    const confianzaVisitante = 100 - confianzaLocal;

    if (pctVisitante > pctLocal) {
      return { 
        ganador: juego.teams.away.team.name, 
        confianza: confianzaVisitante,
        razon: `Dominio estadístico (${recordVisitante.wins}-${recordVisitante.losses})` 
      };
    } else {
      return { 
        ganador: juego.teams.home.team.name, 
        confianza: confianzaLocal,
        razon: `Ventaja de casa y récord (${recordLocal.wins}-${recordLocal.losses})` 
      };
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-6">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-blue-500">⚾ MLB AI Predictor</h1>
        <p className="text-slate-400">Análisis basado en rendimiento de temporada</p>
      </header>

      <main className="w-full max-w-2xl space-y-6">
        {cargando ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="animate-pulse">Calculando probabilidades...</p>
          </div>
        ) : partidos.length > 0 ? (
          partidos.map((juego) => {
            const prediccion = obtenerPrediccion(juego);
            return (
              <div key={juego.gamePk} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
                {/* Cabecera del Partido */}
                <div className="p-4 bg-slate-700/50 flex justify-between items-center border-b border-slate-600">
                  <span className="text-xs font-mono text-blue-300">{juego.venue.name}</span>
                  <span className="text-xs bg-blue-600 px-2 py-1 rounded">MLB</span>
                </div>

                {/* Equipos */}
                <div className="p-6 flex justify-around items-center">
                  <div className="text-center w-1/3">
                    <p className="text-lg font-bold">{juego.teams.away.team.name}</p>
                    <p className="text-xs text-slate-400">({juego.teams.away.leagueRecord.wins}-{juego.teams.away.leagueRecord.losses})</p>
                  </div>
                  <div className="text-xl font-black text-slate-600 italic">VS</div>
                  <div className="text-center w-1/3">
                    <p className="text-lg font-bold">{juego.teams.home.team.name}</p>
                    <p className="text-xs text-slate-400">({juego.teams.home.leagueRecord.wins}-{juego.teams.home.leagueRecord.losses})</p>
                  </div>
                </div>

                {/* Sección de la IA con Barra de Confianza */}
                <div className="p-4 bg-blue-900/20 border-t border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-400">🤖</span>
                      <span className="text-sm font-bold text-blue-400 uppercase tracking-wider">Análisis IA</span>
                    </div>
                    <span className="text-xs font-bold text-green-400">{prediccion.confianza}% Confianza</span>
                  </div>
                  
                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-700 h-2 rounded-full mb-3 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all duration-1000" 
                      style={{ width: `${prediccion.confianza}%` }}
                    ></div>
                  </div>

                  <p className="text-sm">Favorito: <span className="text-green-400 font-bold">{prediccion.ganador}</span></p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase italic tracking-tighter">
                    Fundamento: {prediccion.razon}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-slate-500">No hay datos disponibles para hoy.</p>
        )}
      </main>

      <footer className="mt-10 text-slate-600 text-[10px] uppercase tracking-widest">
        Datos proporcionados por MLB Stats API
      </footer>
    </div>
  );
}