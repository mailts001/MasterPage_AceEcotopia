import { snoopyTheme } from './snoopy'
import type { GameTheme } from '../types'

const THEMES: Record<string, GameTheme> = {
  snoopy: snoopyTheme,
  // lunar_new_year: lunarTheme,  ← add new themes here, never touch game logic
  // default: defaultTheme,
}

export function getTheme(id: string): GameTheme {
  return THEMES[id] ?? snoopyTheme
}

export { snoopyTheme }
export type { GameTheme }
