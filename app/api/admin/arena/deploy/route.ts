import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execAsync = promisify(exec)
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ''
const VPS_HOST     = '204.168.221.101'
const VPS_KEY      = `${process.env.HOME}/.ssh/hetzner_trading`
const GAME_ROOT    = '/root/x68-game'

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { theme } = await req.json()
  if (!theme) return NextResponse.json({ error: 'theme required' }, { status: 400 })

  const mapPath     = `/tmp/tilemap_agent/${theme}/district_${theme}.json`
  const tilesetPath = `/tmp/tilemap_agent/${theme}/dungeon_${theme}.png`

  if (!fs.existsSync(mapPath) || !fs.existsSync(tilesetPath)) {
    return NextResponse.json({ error: 'Files not found — generate first' }, { status: 400 })
  }

  const sshOpts = `-i ${VPS_KEY} -o StrictHostKeyChecking=no`

  try {
    // Upload tileset PNG
    await execAsync(
      `scp ${sshOpts} ${tilesetPath} root@${VPS_HOST}:${GAME_ROOT}/packages/client/src/game/assets/images/maps/dungeon_${theme}.png`
    )

    // Upload map JSON
    await execAsync(
      `scp ${sshOpts} ${mapPath} root@${VPS_HOST}:${GAME_ROOT}/packages/common/src/maps/district_${theme}.json`
    )

    // Register map in index.ts and trigger rebuild
    const registerAndBuild = `
python3 -c "
with open('${GAME_ROOT}/packages/common/src/maps/index.ts') as f: c = f.read()
name = 'district_${theme}'
if name not in c:
    c = c.replace(\"import gigantic\", \"import \" + name + \" from './\" + name + \".json';\\nimport gigantic\")
    c = c.replace('    gigantic,', '    ' + name + ',\\n    gigantic,')
    with open('${GAME_ROOT}/packages/common/src/maps/index.ts', 'w') as f: f.write(c)
    print('registered')
else:
    print('already registered')
" && cd ${GAME_ROOT} && screen -dmS build_${theme} bash -c 'yarn build > /tmp/build_${theme}.log 2>&1; systemctl restart colyseus_game; echo DONE >> /tmp/build_${theme}.log'
`
    await execAsync(`ssh ${sshOpts} root@${VPS_HOST} "${registerAndBuild.replace(/\n/g, ' ')}"`)

    return NextResponse.json({
      ok: true,
      message: `Deployed district_${theme}. Build started — check: ssh root@${VPS_HOST} "tail -2 /tmp/build_${theme}.log"`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
