// Snoopy-inspired theme — comic strip aesthetic with simple SVG characters.
// NOT actual Peanuts IP. Original black-outline dog + yellow bird characters.
// Replace SVG components with licensed assets if/when a deal is signed.

'use client'

import React from 'react'
import type { GameTheme } from '../types'

// ─── Mascot SVGs ─────────────────────────────────────────────────────────────

const DogIdle: React.FC<{ className?: string }> = ({ className = '' }) =>
  React.createElement('svg', {
    className,
    viewBox: '0 0 80 80',
    xmlns: 'http://www.w3.org/2000/svg',
  },
    // Body
    React.createElement('ellipse', { cx: 40, cy: 52, rx: 18, ry: 14, fill: 'white', stroke: 'black', strokeWidth: 2.5 }),
    // Head
    React.createElement('circle', { cx: 40, cy: 30, r: 16, fill: 'white', stroke: 'black', strokeWidth: 2.5 }),
    // Ears (floppy)
    React.createElement('ellipse', { cx: 26, cy: 26, rx: 7, ry: 11, fill: '#c8a87a', stroke: 'black', strokeWidth: 2, transform: 'rotate(-15 26 26)' }),
    React.createElement('ellipse', { cx: 54, cy: 26, rx: 7, ry: 11, fill: '#c8a87a', stroke: 'black', strokeWidth: 2, transform: 'rotate(15 54 26)' }),
    // Eyes
    React.createElement('circle', { cx: 34, cy: 28, r: 3, fill: 'black' }),
    React.createElement('circle', { cx: 46, cy: 28, r: 3, fill: 'black' }),
    // Nose
    React.createElement('ellipse', { cx: 40, cy: 35, rx: 4, ry: 3, fill: 'black' }),
    // Mouth (slight smile)
    React.createElement('path', { d: 'M 36 40 Q 40 44 44 40', fill: 'none', stroke: 'black', strokeWidth: 2, strokeLinecap: 'round' }),
    // Tail
    React.createElement('path', { d: 'M 56 52 Q 68 44 64 36', fill: 'none', stroke: 'black', strokeWidth: 3, strokeLinecap: 'round' }),
    // Paws
    React.createElement('ellipse', { cx: 28, cy: 64, rx: 7, ry: 4, fill: 'white', stroke: 'black', strokeWidth: 2 }),
    React.createElement('ellipse', { cx: 52, cy: 64, rx: 7, ry: 4, fill: 'white', stroke: 'black', strokeWidth: 2 }),
  )

const DogSuccess: React.FC<{ className?: string }> = ({ className = '' }) =>
  React.createElement('svg', {
    className,
    viewBox: '0 0 80 80',
    xmlns: 'http://www.w3.org/2000/svg',
  },
    // Body — arms raised
    React.createElement('ellipse', { cx: 40, cy: 52, rx: 18, ry: 14, fill: 'white', stroke: 'black', strokeWidth: 2.5 }),
    // Arms up
    React.createElement('line', { x1: 24, y1: 46, x2: 14, y2: 32, stroke: 'black', strokeWidth: 3, strokeLinecap: 'round' }),
    React.createElement('line', { x1: 56, y1: 46, x2: 66, y2: 32, stroke: 'black', strokeWidth: 3, strokeLinecap: 'round' }),
    // Head
    React.createElement('circle', { cx: 40, cy: 28, r: 16, fill: 'white', stroke: 'black', strokeWidth: 2.5 }),
    React.createElement('ellipse', { cx: 26, cy: 24, rx: 7, ry: 11, fill: '#c8a87a', stroke: 'black', strokeWidth: 2, transform: 'rotate(-15 26 24)' }),
    React.createElement('ellipse', { cx: 54, cy: 24, rx: 7, ry: 11, fill: '#c8a87a', stroke: 'black', strokeWidth: 2, transform: 'rotate(15 54 24)' }),
    // Happy eyes (arcs)
    React.createElement('path', { d: 'M 30 26 Q 34 22 38 26', fill: 'none', stroke: 'black', strokeWidth: 2.5, strokeLinecap: 'round' }),
    React.createElement('path', { d: 'M 42 26 Q 46 22 50 26', fill: 'none', stroke: 'black', strokeWidth: 2.5, strokeLinecap: 'round' }),
    React.createElement('ellipse', { cx: 40, cy: 33, rx: 4, ry: 3, fill: 'black' }),
    // Big grin
    React.createElement('path', { d: 'M 32 38 Q 40 46 48 38', fill: 'none', stroke: 'black', strokeWidth: 2.5, strokeLinecap: 'round' }),
    // Stars
    React.createElement('text', { x: 2, y: 14, fontSize: 10 }, '⭐'),
    React.createElement('text', { x: 62, y: 14, fontSize: 10 }, '⭐'),
  )

const DogFail: React.FC<{ className?: string }> = ({ className = '' }) =>
  React.createElement('svg', {
    className,
    viewBox: '0 0 80 80',
    xmlns: 'http://www.w3.org/2000/svg',
  },
    React.createElement('ellipse', { cx: 40, cy: 52, rx: 18, ry: 14, fill: 'white', stroke: 'black', strokeWidth: 2.5 }),
    React.createElement('circle', { cx: 40, cy: 30, r: 16, fill: 'white', stroke: 'black', strokeWidth: 2.5 }),
    React.createElement('ellipse', { cx: 26, cy: 26, rx: 7, ry: 11, fill: '#c8a87a', stroke: 'black', strokeWidth: 2, transform: 'rotate(-15 26 26)' }),
    React.createElement('ellipse', { cx: 54, cy: 26, rx: 7, ry: 11, fill: '#c8a87a', stroke: 'black', strokeWidth: 2, transform: 'rotate(15 54 26)' }),
    // Sad eyes (tilted)
    React.createElement('ellipse', { cx: 34, cy: 28, rx: 3, ry: 3, fill: 'black', transform: 'rotate(-20 34 28)' }),
    React.createElement('ellipse', { cx: 46, cy: 28, rx: 3, ry: 3, fill: 'black', transform: 'rotate(20 46 28)' }),
    React.createElement('ellipse', { cx: 40, cy: 35, rx: 4, ry: 3, fill: 'black' }),
    // Sad mouth
    React.createElement('path', { d: 'M 34 42 Q 40 38 46 42', fill: 'none', stroke: 'black', strokeWidth: 2, strokeLinecap: 'round' }),
    // Sweat drop
    React.createElement('ellipse', { cx: 57, cy: 24, rx: 3, ry: 4, fill: '#6ec6f5', stroke: 'black', strokeWidth: 1 }),
    React.createElement('ellipse', { cx: 28, cy: 64, rx: 7, ry: 4, fill: 'white', stroke: 'black', strokeWidth: 2 }),
    React.createElement('ellipse', { cx: 52, cy: 64, rx: 7, ry: 4, fill: 'white', stroke: 'black', strokeWidth: 2 }),
  )

const YellowBird: React.FC<{ className?: string }> = ({ className = '' }) =>
  React.createElement('svg', {
    className,
    viewBox: '0 0 40 40',
    xmlns: 'http://www.w3.org/2000/svg',
  },
    // Body
    React.createElement('ellipse', { cx: 20, cy: 26, rx: 10, ry: 9, fill: '#fdd835', stroke: 'black', strokeWidth: 2 }),
    // Head
    React.createElement('circle', { cx: 20, cy: 14, r: 9, fill: '#fdd835', stroke: 'black', strokeWidth: 2 }),
    // Topknot
    React.createElement('path', { d: 'M 17 6 Q 20 0 23 6', fill: 'none', stroke: 'black', strokeWidth: 2, strokeLinecap: 'round' }),
    // Eye
    React.createElement('circle', { cx: 22, cy: 13, r: 2.5, fill: 'black' }),
    // Beak
    React.createElement('path', { d: 'M 18 17 L 24 17 L 21 20 Z', fill: '#ff9800', stroke: 'black', strokeWidth: 1 }),
    // Wing
    React.createElement('ellipse', { cx: 10, cy: 26, rx: 5, ry: 3, fill: '#f9a825', stroke: 'black', strokeWidth: 1.5, transform: 'rotate(-20 10 26)' }),
  )

// ─── Theme export ─────────────────────────────────────────────────────────────

export const snoopyTheme: GameTheme = {
  id: 'snoopy',
  name: 'Comic Strip',

  colors: {
    background:  '#fef9f0',      // warm cream — like old comics paper
    panel:       '#ffffff',
    panelBorder: '#1a1a1a',      // thick comic outline
    primary:     '#e53935',      // classic red
    secondary:   '#1565c0',      // comic blue
    text:        '#1a1a1a',
    textMuted:   '#555555',
    success:     '#2e7d32',
    danger:      '#c62828',
    reward:      '#f57f17',      // golden coupon colour
    scoreGlow:   '#fdd835',      // yellow flash
  },

  assets: {
    mascotIdle:    DogIdle,
    mascotSuccess: DogSuccess,
    mascotFail:    DogFail,
    guide:         YellowBird,
    targetGlow:    '#fdd835',
    decoyTint:     'grayscale(60%) opacity(0.7)',
  },

  copy: {
    gameName:       'Deal Hunt',
    tagline:        "Good grief — what a deal!",
    objective:      "Find the featured deal hidden among the crowd. Tap it before time's up!",
    scoreLabel:     'Happiness',
    timerLabel:     'Time',
    rewardHeadline: "You found it!",
    rewardSub:      "Snoopy would be proud.",
    failHeadline:   "Good grief!",
    failSub:        "The deal got away. Try again?",
    ctaPlay:        'Play',
    ctaRedeem:      'Claim Coupon',
    ctaShareScore:  'Share Score',
  },

  fontFamily:   "'Comic Sans MS', 'Chalkboard SE', cursive",
  borderRadius: '16px',
}
