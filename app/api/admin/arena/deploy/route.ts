import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'ssh2'
import fs from 'fs'
import os from 'os'
import path from 'path'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ''
const VPS_HOST     = '204.168.221.101'
const VPS_KEY_PATH = path.join(os.homedir(), '.ssh/hetzner_trading')
const GAME_ROOT    = '/root/x68-game'

function sshExec(conn: Client, cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('data', (d: Buffer) => { out += d.toString() })
      stream.stderr.on('data', (d: Buffer) => { out += d.toString() })
      stream.on('close', () => resolve(out.trim()))
    })
  })
}

function sshPutFile(conn: Client, content: string, remotePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err)
      const writeStream = sftp.createWriteStream(remotePath)
      writeStream.on('close', resolve)
      writeStream.on('error', reject)
      writeStream.end(Buffer.from(content, 'utf8'))
    })
  })
}

function connectSSH(): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client()

    // Prefer env var (Vercel), fall back to local key file (dev)
    let privateKey: Buffer | string
    if (process.env.VPS_SSH_KEY_B64) {
      privateKey = Buffer.from(process.env.VPS_SSH_KEY_B64, 'base64')
    } else if (fs.existsSync(VPS_KEY_PATH)) {
      privateKey = fs.readFileSync(VPS_KEY_PATH)
    } else {
      return reject(new Error('No SSH key: set VPS_SSH_KEY_B64 env var or place key at ~/.ssh/hetzner_trading'))
    }

    conn.on('ready', () => resolve(conn))
    conn.on('error', reject)
    conn.connect({ host: VPS_HOST, port: 22, username: 'root', privateKey })
  })
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { theme, mapJson } = await req.json()
  if (!theme || !mapJson) return NextResponse.json({ error: 'theme and mapJson required' }, { status: 400 })

  let conn: Client | null = null
  try {
    conn = await connectSSH()

    // Upload map JSON via SFTP
    const mapContent = JSON.stringify(mapJson, null, 2)
    const remotePath = `${GAME_ROOT}/packages/common/src/maps/district_${theme}.json`
    await sshPutFile(conn, mapContent, remotePath)

    // Register in index.ts if not already there
    const regOut = await sshExec(conn, `
name=district_${theme}
file=${GAME_ROOT}/packages/common/src/maps/index.ts
if ! grep -q "$name" "$file"; then
  sed -i "s|import gigantic|import $name from './$name.json';\\nimport gigantic|" "$file"
  sed -i "s|    gigantic,|    $name,\\n    gigantic,|" "$file"
  echo "registered"
else
  echo "already registered"
fi`)

    // Write lightweight server-only esbuild script (avoids yarn build RAM spike)
    const buildScript = `
const{build}=require('${GAME_ROOT}/node_modules/esbuild');
build({entryPoints:['${GAME_ROOT}/packages/server/src/index.ts'],outfile:'${GAME_ROOT}/packages/server/dist/index.js',define:{'process.env.NODE_ENV':JSON.stringify('production')},external:['express','hiredis','default-gateway','cors'],platform:'node',target:'node14.15.5',bundle:true,minify:false,sourcemap:false})
.then(()=>{require('child_process').execSync('systemctl restart colyseus_game');require('fs').writeFileSync('/tmp/build_${theme}.log','DONE');})
.catch(e=>{require('fs').writeFileSync('/tmp/build_${theme}.log','ERROR: '+e.message);});`

    await sshPutFile(conn, buildScript, `/tmp/build_${theme}.js`)
    await sshExec(conn, `screen -dmS rebuild_${theme} bash -c 'NODE_OPTIONS="--max-old-space-size=1500" node /tmp/build_${theme}.js'`)

    conn.end()
    return NextResponse.json({ ok: true, message: `district_${theme} deployed. ${regOut}. Server rebuilding (~30 sec) — refresh the game after.` })
  } catch (e: any) {
    conn?.end()
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
