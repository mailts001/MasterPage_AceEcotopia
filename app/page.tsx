import HeroSection from '@/components/hero/HeroSection'
import DistrictsSection from '@/components/districts/DistrictsSection'
import X68CityMap from '@/components/citymap/X68CityMap'
import DistrictGuide from '@/components/education/DistrictGuide'
import NexusTravelCinematic from '@/components/districts/nexustravel/NexusTravelCinematic'

export default function HomePage() {
  return (
    <main>
      <HeroSection />

      {/* NexusTravel cinematic scroll scene — full viewport pinned experience */}
      <NexusTravelCinematic />

      <DistrictsSection />

      {/* City map — anchor for nav */}
      <div id="city">
        <X68CityMap />
      </div>

      {/* Guide / FAQ — anchor for nav */}
      <div id="guide">
        <DistrictGuide />
      </div>

      {/* How it works */}
      <section className="py-24 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            How <span className="gradient-text">Citizenship</span> Works
          </h2>
          <p className="text-slate-400 text-lg mb-16">
            Four steps from visitor to AI-powered citizen
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Enter Free', desc: 'Explore all districts. See live AI activity. No account needed.', icon: '👀' },
              { step: '02', title: 'Register', desc: 'Create your citizen profile. Save properties, stocks, routes.', icon: '🪪' },
              { step: '03', title: 'Get Alerts', desc: 'AI monitors your assets 24/7. Alerts via Telegram or email.', icon: '🔔' },
              { step: '04', title: 'Act & Earn', desc: 'Act on signals. Save money. Earn credits by referring friends.', icon: '💰' },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-4xl mb-3">{item.icon}</div>
                <div className="text-xs font-mono text-cyan-500 mb-2">{item.step}</div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing tiers — anchor for nav */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple <span className="gradient-text">Pricing</span></h2>
            <p className="text-slate-400">Start free. Upgrade when the AI pays for itself.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Explorer',
                price: 'Free',
                period: 'forever',
                desc: 'See what the AI finds. No commitment.',
                features: [
                  '3 alerts/month across all 4 districts',
                  'Read-only access to all district dashboards',
                  'Basic watchlist (up to 5 assets)',
                  '100 API calls/day (1 key)',
                  '50 Nexus Credits on signup',
                  'Earn credits by referring friends',
                ],
                cta: 'Start Free',
                href: '/citizen/register',
                highlight: false,
              },
              {
                name: 'Citizen',
                price: '$19',
                period: '/month',
                desc: 'Unlimited AI monitoring. Telegram delivery.',
                features: [
                  'Unlimited alerts — all 4 districts',
                  'Telegram instant delivery (before email)',
                  'Unlimited watchlist assets',
                  '10,000 API calls/day (3 keys)',
                  '100 bonus Nexus Credits/month',
                  'Priority signals queue',
                  'Full write access to all districts',
                ],
                cta: 'Become a Citizen',
                href: '/upgrade',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                desc: 'White-label X68 for your business or platform.',
                features: [
                  'White-label district branding',
                  'Custom district creation',
                  'Unlimited API calls (10 keys)',
                  'Revenue share on sub-citizens',
                  'Dedicated Telegram support channel',
                  'SLA + onboarding',
                ],
                cta: 'Contact Us',
                href: 'mailto:admin@aceecotopia.com',
                highlight: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`district-card rounded-2xl p-6 ${tier.highlight ? 'border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 to-blue-500/10' : ''}`}
              >
                {tier.highlight && (
                  <div className="text-xs font-medium text-cyan-400 mb-3 uppercase tracking-wider">Most Popular</div>
                )}
                <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-bold text-white">{tier.price}</span>
                  <span className="text-slate-500 text-sm">{tier.period}</span>
                </div>
                <p className="text-slate-500 text-sm mb-4">{tier.desc}</p>
                <ul className="space-y-2 mb-6">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="text-green-400 mt-0.5 shrink-0">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={tier.href}
                  className={`block text-center py-3 px-4 rounded-xl font-semibold transition-all text-sm ${
                    tier.highlight
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90'
                      : 'border border-slate-600 text-slate-300 hover:border-slate-400'
                  }`}
                >
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>

          {/* Moat clarity note */}
          <div className="mt-12 bg-white/3 border border-white/10 rounded-2xl p-6 text-center max-w-2xl mx-auto">
            <p className="text-sm text-gray-400 mb-3">
              <span className="text-white font-semibold">Beyond alerts:</span> your moats as a citizen
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-500">
              {[
                { icon: '📡', label: 'AI signals', sub: 'before the crowd' },
                { icon: '💎', label: 'Nexus Credits', sub: 'from referrals' },
                { icon: '🔑', label: 'API access', sub: 'build on top' },
                { icon: '🏙️', label: 'City rank', sub: 'district leaderboard' },
              ].map(m => (
                <div key={m.label} className="bg-white/5 rounded-xl p-3">
                  <div className="text-lg mb-1">{m.icon}</div>
                  <div className="text-white font-medium">{m.label}</div>
                  <div className="text-gray-600">{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <div className="text-xl font-bold gradient-text">X68</div>
              <div className="text-sm text-slate-600 mt-1">New Economic Verse</div>
            </div>
            <div className="flex gap-8 text-sm text-slate-500">
              <a href="/developer" className="hover:text-cyan-400 transition-colors">Developer API</a>
              <a href="#guide" className="hover:text-cyan-400 transition-colors">Help</a>
              <a href="/citizen/register" className="hover:text-cyan-400 transition-colors">Join Free</a>
              <a href="mailto:admin@aceecotopia.com" className="hover:text-cyan-400 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
