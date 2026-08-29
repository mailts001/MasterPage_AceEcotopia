import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ''
const AGENT_PATH   = path.join(process.cwd(), 'tilemap_agent.py')
const OVERRIDE_BASE = path.join(process.cwd(), 'tile_overrides')

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { prompt, theme, features } = await req.json()
  if (!prompt || !theme) {
    return new Response(JSON.stringify({ error: 'prompt and theme required' }), { status: 400 })
  }

  const encoder = new TextEncoder()

  function send(stream: WritableStreamDefaultWriter, obj: object) {
    stream.write(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
  }

  const readable = new ReadableStream({
    async start(controller) {
      const writer = {
        write: (chunk: Uint8Array) => controller.enqueue(chunk),
      } as unknown as WritableStreamDefaultWriter

      function emit(obj: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      const args = [
        AGENT_PATH,
        '--prompt', prompt,
        '--theme', theme,
        '--features', ...(features ?? ['portals']),
        '--preview-only',
      ]

      const overrideDir = path.join(OVERRIDE_BASE, theme)
      const fs = await import('fs')
      if (fs.existsSync(overrideDir)) {
        args.push('--override-dir', overrideDir)
      }

      emit({ log: `[Arena] Starting generation for theme: ${theme}` })
      emit({ log: `[Arena] Features: ${(features ?? []).join(', ')}` })

      const proc = spawn('python3', args, { env: { ...process.env } })

      let output = ''

      proc.stdout.on('data', (data: Buffer) => {
        const text = data.toString()
        output += text
        for (const line of text.split('\n')) {
          if (line.trim()) emit({ log: line })
        }
      })

      proc.stderr.on('data', (data: Buffer) => {
        const text = data.toString()
        for (const line of text.split('\n')) {
          if (line.trim()) emit({ log: line })
        }
      })

      proc.on('close', async (code: number) => {
        if (code !== 0) {
          emit({ error: `Agent exited with code ${code}` })
          controller.close()
          return
        }

        // Generate ASCII map preview
        try {
          const mapPath = `/tmp/tilemap_agent/${theme}/district_${theme}.json`
          const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
          const layers: Record<string, number[]> = {}
          for (const l of mapData.layers) {
            if (l.type === 'tilelayer') layers[l.name] = l.data
          }
          const W = mapData.width
          let preview = ''
          for (let y = 0; y < 32; y++) {
            let row = ''
            for (let x = 0; x < 32; x++) {
              const i = y * W + x
              const w  = layers.walls?.[i]   ?? 0
              const d  = layers.decor?.[i]   ?? 0
              const s  = layers.spawners?.[i]?? 0
              const oh = layers.overhead?.[i]?? 0
              const g  = layers.ground?.[i]  ?? 0
              if (w)       row += '█'
              else if (d === 84) row += 'P'
              else if (d === 94) row += '+'
              else if (s)  row += 'S'
              else if (oh) row += '▄'
              else if (g === 40) row += '░'
              else if (g === 29) row += '·'
              else if (g === 38) row += '▪'
              else if (g === 28) row += '-'
              else row += ' '
            }
            preview += row + '\n'
          }
          emit({ preview })
        } catch (e: any) {
          emit({ log: `Preview render failed: ${e.message}` })
        }

        emit({ done: true })
        controller.close()
      })

      proc.on('error', (err: Error) => {
        emit({ error: err.message })
        controller.close()
      })
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
