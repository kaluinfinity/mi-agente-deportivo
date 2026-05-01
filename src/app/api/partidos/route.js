import { NextResponse } from 'next/server';

export async function GET() {
  // Obtenemos la fecha de hoy en formato YYYY-MM-DD
  const hoy = new Date().toISOString().split('T')[0];
  
  const url = `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${hoy}`;

  try {
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    
    // Extraemos solo la lista de partidos
    const partidos = datos.dates[0]?.games || [];
    
    return NextResponse.json(partidos);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 });
  }
}