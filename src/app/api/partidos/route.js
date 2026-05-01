import { NextResponse } from 'next/server';

export async function GET() {
  const hoy = new Date().toISOString().split('T')[0];
  // IMPORTANTE: Hydrate debe incluir 'statistics' en team y 'probablePitcher'
  const url = `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${hoy}&hydrate=team(statistics),probablePitcher(statistics),venue(weather)`;

  try {
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    return NextResponse.json(datos.dates[0]?.games || []);
  } catch (error) {
    return NextResponse.json({ error: "Error de red" }, { status: 500 });
  }
}