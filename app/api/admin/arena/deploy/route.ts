import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import os from 'os'
import path from 'path'

const execAsync = promisify(exec)
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ''
const VPS_HOST     = '204.168.221.101'
const VPS_KEY      = path.join(os.homedir(), '.ssh/hetzner_trading')
const GAME_ROOT    = '/root/x68-game'

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { theme, mapJson } = await req.json()
  if (!theme) return NextResponse.json({ error: 'theme required' }, { status: 400 })

  const sshOpts = `-i ${VPS_KEY} -o StrictHostKeyChecking=no -o ConnectTimeout=10`

  try {
    // Write mapJson to a temp file for scp
    const tmpMap = path.join(os.tmpdir(), `district_${theme}.json`)
    fs.writeFileSync(tmpMap, JSON.stringify(mapJson, null, 2))

    // Upload map JSON to VPS
    await execAsync(`scp ${sshOpts} ${tmpMap} root@${VPS_HOST}:${GAME_ROOT}/packages/common/src/maps/district_${theme}.json`)
    fs.unlinkSync(tmpMap)

    // Register map in index.ts if needed, then rebuild
    const cmd = `
name=district_${theme}
file=${GAME_ROOT}/packages/common/src/maps/index.ts
if ! grep -q "$name" "$file"; then
  sed -i "s|import gigantic|import $name from './$name.json';\\nimport gigantic|" "$file"
  sed -i "s|    gigantic,|    $name,\\n    gigantic,|" "$file"
  echo "registered"
else
  echo "already registered"
fi
screen -dmS rebuild_${theme} bash -c 'cd ${GAME_ROOT} && yarn build > /tmp/build_${theme}.log 2>&1; systemctl restart colyseus_game; echo DONE >> /tmp/build_${theme}.log'
`.trim()

    const { stdout } = await execAsync(`ssh ${sshOpts} root@${VPS_HOST} '${cmd.replace(/'/g, "'\\''")}'`)

    return NextResponse.json({
      ok: true,
      message: `Deployed district_${theme}. ${stdout.trim()}. Build started — check: tail -2 /tmp/build_${theme}.log`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
