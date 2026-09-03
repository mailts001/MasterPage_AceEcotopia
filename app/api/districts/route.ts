import { NextResponse } from 'next/server'

const ZONE_MANAGER = 'http://204.168.221.101:3099'

export const revalidate = 0

export async function GET() {
  try {
    const res = await fetch(`${ZONE_MANAGER}/districts`, { cache: 'no-store', signal: AbortSignal.timeout(3000) })
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    })
  } catch {
    // Fallback: return static district list with active=false so UI still renders
    return NextResponse.json(FALLBACK_DISTRICTS, { status: 200 })
  }
}

const FALLBACK_DISTRICTS = [
  { id: 'hub',      name: 'Nexus Hub',         genre: 'Social Lobby',         color: '#7C3AED', active: false, players: 0, max_players: 50  },
  { id: 'boutique', name: 'Boutique District',  genre: 'Social / Plaza',       color: '#EC4899', active: false, players: 0, max_players: 30  },
  { id: 'harvest',  name: 'Harvest Fields',     genre: 'Farming Sim',          color: '#84CC16', active: false, players: 0, max_players: 20  },
  { id: 'aqua',     name: 'Aqua Zone',          genre: 'Platformer',           color: '#06B6D4', active: false, players: 0, max_players: 20  },
  { id: 'grove',    name: 'Whispering Grove',   genre: 'Open World',           color: '#10B981', active: false, players: 0, max_players: 25  },
  { id: 'castle',   name: 'Castle Ramparts',    genre: 'RPG Raid',             color: '#F59E0B', active: false, players: 0, max_players: 20  },
  { id: 'neon',     name: 'Neon City',          genre: 'Top-down Shooter',     color: '#EF4444', active: false, players: 0, max_players: 16  },
  { id: 'carnival', name: 'Carnival Square',    genre: 'Party Games',          color: '#F97316', active: false, players: 0, max_players: 24  },
  { id: 'glacier',  name: 'Glacier Peak',       genre: 'Ice Physics Puzzler',  color: '#3B82F6', active: false, players: 0, max_players: 16  },
]
