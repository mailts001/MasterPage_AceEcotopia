/**
 * POST /api/nexus/track
 * Lightweight page-view tracker. Called from the layout on first load.
 * Records IP + path into visitor_logs. Upserts by (ip, date) to count unique daily IPs.
 * Table created with: see comment at bottom of this file.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'

    const { path } = await req.json().catch(() => ({ path: '/' }))
    const today = new Date().toISOString().slice(0, 10)
    const db = adminDb()

    await db.from('visitor_logs').upsert(
      { ip, date: today, path, visits: 1, last_seen: new Date().toISOString() },
      { onConflict: 'ip,date', ignoreDuplicates: false }
    )

    // Increment visits count on conflict
    await db.rpc('increment_visits', { p_ip: ip, p_date: today })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 }) // silent fail
  }
}

/*
SQL to run in Supabase dashboard:

create table if not exists visitor_logs (
  ip text not null,
  date date not null,
  path text,
  visits integer default 1,
  last_seen timestamptz default now(),
  primary key (ip, date)
);

create or replace function increment_visits(p_ip text, p_date date)
returns void language plpgsql as $$
begin
  update visitor_logs set visits = visits + 1, last_seen = now()
  where ip = p_ip and date = p_date;
end;
$$;

-- View for admin: unique IPs per day
create or replace view unique_visitors as
select date, count(*) as unique_ips, sum(visits) as total_hits
from visitor_logs group by date order by date desc;
*/
