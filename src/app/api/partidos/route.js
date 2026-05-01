import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Configuración de caché (opcional, pero recomendado)
const redis = Redis.fromEnv();
const CACHE_TTL = 3600; // 1 hora en segundos

// MEJORA 1: Headers para rate limiting y caché
const HEADERS_API = {
  'User-Agent': 'MLB-Analytics-Agent/1.0',
  'Accept': 'application/json',
};

// MEJORA 2: Transformación de datos para unificar formato
const transformarJuego = (game) => {
  if (!game || !game.teams) return null;
  
  const visitante = game.teams.away;
  const local = game.teams.home;
  
  // Extraer estadísticas de hitting
  const obtenerStatsHitting = (team) => {
    const stats = team?.team?.statistics?.find(
      s => s?.group?.displayName === 'hitting'
    )?.stats || {};
    
    return {
      ops: parseFloat(stats.ops) || null,
      avg: parseFloat(stats.avg) || null,
      hr: parseInt(stats.homeRuns) || null,
      runs: parseInt(stats.runs) || null,
      // MEJORA 3: Campos para métricas avanzadas (se llenarán después)
      barrelPct: null,
      xwOBA: null,
      hardHitPct: null,
      kPct: null,
      bbPct: null
    };
  };
  
  // Extraer estadísticas de pitching
  const obtenerStatsPitching = (pitcher) => {
    const stats = pitcher?.statistics?.find(
      s => s?.group?.displayName === 'pitching'
    )?.stats || {};
    
    return {
      era: parseFloat(stats.era) || null,
      whip: parseFloat(stats.whip) || null,
      k9: parseFloat(stats.strikeoutsPer9Inn) || null,
      bb9: parseFloat(stats.baseOnBallsPer9Inn) || null,
      // MEJORA 3: Para Stuff+ necesitaríamos fuente externa
      stuffPlus: null
    };
  };
  
  return {
    gamePk: game.gamePk,
    status: game.status?.detailedState || 'Preview',
    date: game.gameDate,
    venue: {
      name: game.venue?.name || 'Unknown',
      weather: {
        temp: game.venue?.weather?.temp || null,
        condition: game.venue?.weather?.condition || null,
        wind: game.venue?.weather?.wind || null
      }
    },
    teams: {
      away: {
        team: {
          id: visitante?.team?.id,
          name: visitante?.team?.name,
          abbreviation: visitante?.team?.abbreviation
        },
        probablePitcher: {
          id: visitante?.probablePitcher?.id,
          fullName: visitante?.probablePitcher?.fullName,
          statistics: obtenerStatsPitching(visitante?.probablePitcher)
        },
        leagueRecord: visitante?.leagueRecord,
        statistics: obtenerStatsHitting(visitante)
      },
      home: {
        team: {
          id: local?.team?.id,
          name: local?.team?.name,
          abbreviation: local?.team?.abbreviation
        },
        probablePitcher: {
          id: local?.probablePitcher?.id,
          fullName: local?.probablePitcher?.fullName,
          statistics: obtenerStatsPitching(local?.probablePitcher)
        },
        leagueRecord: local?.leagueRecord,
        statistics: obtenerStatsHitting(local)
      }
    }
  };
};

// MEJORA 4: Función para enriquecer con Statcast (endpoint separado)
const enriquecerConStatcast = async (teamId, season = '2024') => {
  // MLB no expone Statcast directamente, pero podemos usar:
  // 1. Datos históricos de Baseball Savant (necesita scraping)
  // 2. Fallback a correlaciones basadas en stats tradicionales
  
  // Por ahora, simulamos una transformación basada en stats tradicionales
  // En producción, deberías tener una base de datos local con datos de Statcast
  
  const url = `https://statsapi.mlb.com/api/v1/teams/${teamId}/stats?stats=statcast&season=${season}&group=hitting`;
  
  try {
    const response = await fetch(url, { headers: HEADERS_API });
    if (!response.ok) return null;
    const data = await response.json();
    
    // Transformar datos de Statcast a métricas que necesitamos
    const statcast = data.stats?.[0]?.splits?.[0]?.stat || {};
    
    return {
      barrelPct: parseFloat(statcast.barrelBattedRate) || null,
      xwOBA: parseFloat(statcast.xwOBA) || null,
      hardHitPct: parseFloat(statcast.hardHitRate) || null,
      kPct: parseFloat(statcast.strikeoutRate) || null,
      bbPct: parseFloat(statcast.walkRate) || null,
      avgExitVelocity: parseFloat(statcast.avgExitVelocity) || null
    };
  } catch (error) {
    console.error(`Error fetching Statcast for team ${teamId}:`, error);
    return null;
  }
};

// MEJORA 5: Cache con Redis (o memoria simple para desarrollo)
const cacheEnMemoria = new Map();

const obtenerConCache = async (key, fetcher, ttl = CACHE_TTL) => {
  // Intentar caché en memoria
  if (cacheEnMemoria.has(key)) {
    const cached = cacheEnMemoria.get(key);
    if (Date.now() - cached.timestamp < ttl * 1000) {
      return cached.data;
    }
    cacheEnMemoria.delete(key);
  }
  
  // Intentar Redis si está configurado
  if (redis) {
    const cached = await redis.get(key);
    if (cached) return cached;
  }
  
  // Fetch fresh data
  const data = await fetcher();
  
  // Guardar en caché
  cacheEnMemoria.set(key, { data, timestamp: Date.now() });
  if (redis) await redis.setex(key, ttl, data);
  
  return data;
};

// MEJORA 6: Rate limiting simple
const rateLimiter = new Map();
const checkRateLimit = (ip) => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxRequests = 30;
  
  const userRequests = rateLimiter.get(ip) || [];
  const recentRequests = userRequests.filter(t => now - t < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimiter.set(ip, recentRequests);
  return true;
};

// MEJORA 7: Endpoint principal mejorado
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fechaInicio = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
  const fechaFin = searchParams.get('endDate') || fechaInicio;
  const incluirStatcast = searchParams.get('statcast') === 'true';
  
  // Rate limiting (opcional)
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 30 requests per minute." },
      { status: 429 }
    );
  }
  
  const cacheKey = `mlb_games_${fechaInicio}_${fechaFin}_${incluirStatcast}`;
  
  try {
    const juegos = await obtenerConCache(cacheKey, async () => {
      // Construir URL con rango de fechas
      const url = `https://statsapi.mlb.com/api/v1/schedule/games/` +
                  `?sportId=1` +
                  `&startDate=${fechaInicio}` +
                  `&endDate=${fechaFin}` +
                  `&hydrate=team(statistics),probablePitcher(statistics),venue(weather),game(content(summary))`;
      
      const respuesta = await fetch(url, { headers: HEADERS_API });
      
      if (!respuesta.ok) {
        throw new Error(`MLB API responded with status ${respuesta.status}`);
      }
      
      const datos = await respuesta.json();
      
      // Transformar todos los juegos
      let juegosTransformados = [];
      for (const fechaData of datos.dates || []) {
        for (const game of fechaData.games || []) {
          const transformado = transformarJuego(game);
          if (transformado) juegosTransformados.push(transformado);
        }
      }
      
      // MEJORA 8: Enriquecer con Statcast si se solicita
      if (incluirStatcast && juegosTransformados.length > 0) {
        // Obtener IDs de equipos únicos
        const teamIds = new Set();
        for (const juego of juegosTransformados) {
          teamIds.add(juego.teams.away.team.id);
          teamIds.add(juego.teams.home.team.id);
        }
        
        // Enriquecer en paralelo
        const statcastPromises = Array.from(teamIds).map(async (teamId) => {
          const statcast = await enriquecerConStatcast(teamId);
          return { teamId, statcast };
        });
        
        const statcastResults = await Promise.all(statcastPromises);
        const statcastMap = new Map(statcastResults.map(r => [r.teamId, r.statcast]));
        
        // Asignar Statcast a cada juego
        for (const juego of juegosTransformados) {
          const awayStatcast = statcastMap.get(juego.teams.away.team.id);
          const homeStatcast = statcastMap.get(juego.teams.home.team.id);
          
          if (awayStatcast) {
            juego.teams.away.statistics = { ...juego.teams.away.statistics, ...awayStatcast };
          }
          if (homeStatcast) {
            juego.teams.home.statistics = { ...juego.teams.home.statistics, ...homeStatcast };
          }
        }
      }
      
      return juegosTransformados;
    });
    
    // MEJORA 9: Headers de caché para el cliente
    return NextResponse.json(juegos, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache-Key': cacheKey
      }
    });
    
  } catch (error) {
    console.error('Error in MLB API route:', error);
    
    // MEJORA 10: Devolver error estructurado
    return NextResponse.json(
      { 
        error: "Unable to fetch MLB data",
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// MEJORA 11: Endpoint para obtener detalles de un juego específico
export async function POST(request) {
  const { gamePk } = await request.json();
  
  if (!gamePk) {
    return NextResponse.json({ error: "gamePk required" }, { status: 400 });
  }
  
  const cacheKey = `mlb_game_detail_${gamePk}`;
  
  try {
    const detalles = await obtenerConCache(cacheKey, async () => {
      const url = `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;
      const respuesta = await fetch(url, { headers: HEADERS_API });
      
      if (!respuesta.ok) {
        throw new Error(`Failed to fetch game details: ${respuesta.status}`);
      }
      
      const data = await respuesta.json();
      
      // Extraer información adicional útil para predicciones
      return {
        gamePk,
        status: data.gameData?.status?.detailedState,
        venue: {
          name: data.gameData?.venue?.name,
          weather: data.gameData?.weather,
          elevation: data.gameData?.venue?.elevation
        },
        probablePitchers: {
          away: data.gameData?.probablePitchers?.away?.fullName,
          home: data.gameData?.probablePitchers?.home?.fullName
        },
        // Datos de alineación si están disponibles
        lineups: {
          away: data.liveData?.boxscore?.teams?.away?.players,
          home: data.liveData?.boxscore?.teams?.home?.players
        }
      };
    });
    
    return NextResponse.json(detalles);
    
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch game details", message: error.message },
      { status: 500 }
    );
  }
}