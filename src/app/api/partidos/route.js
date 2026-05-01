import { NextResponse } from 'next/server';

export async function GET() {
  const hoy = new Date().toISOString().split('T')[0];
  // Hydrate masivo: estadísticas de temporada, tendencias y datos de localía
  const url = `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${hoy}&hydrate=team(leagueRecord,statistics),probablePitcher(statistics),venue(weather),lineups`;

  try {
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    return NextResponse.json(datos.dates[0]?.games || []);
  } catch (error) {
    return NextResponse.json({ error: "Error de conexión" }, { status: 500 });
  }
}