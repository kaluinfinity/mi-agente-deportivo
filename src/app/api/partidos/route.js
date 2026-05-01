import { NextResponse } from 'next/server';

export async function GET() {
  const hoy = new Date().toISOString().split('T')[0];
  
  // Hydrate ampliado para incluir métricas de Statcast y registros de equipo detallados
  const url = `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${hoy}&hydrate=team(leagueRecord,statistics),probablePitcher(statistics),lineups,venue(weather)`;

  try {
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    const partidos = datos.dates[0]?.games || [];
    
    return NextResponse.json(partidos);
  } catch (error) {
    console.error("Error en API MLB:", error);
    return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 });
  }
}