import Link from 'next/link'
import HeroSection from '@/components/hero/HeroSection'
import DistrictsSection from '@/components/districts/DistrictsSection'
import ExpertRecruitmentStrip from '@/components/humans/ExpertRecruitmentStrip'
import X68CityMap from '@/components/citymap/X68CityMap'
import DistrictGuide from '@/components/education/DistrictGuide'
import DistrictShowcase from '@/components/districts/DistrictShowcase'
import HowItWorksAndPricing from '@/components/HowItWorksAndPricing'

export default function HomePage() {
  return (
    <main>
      <HeroSection />

      {/* All-district scroll showcase — pinned, video per district */}
      <div id="districts">
        <DistrictShowcase />
      </div>

      <DistrictsSection />

      {/* Expert recruitment strip — between districts and city map */}
      <ExpertRecruitmentStrip />

      {/* City map — anchor for nav */}
      <div id="city">
        <X68CityMap />
      </div>

      {/* Guide / FAQ — anchor for nav */}
      <div id="guide">
        <DistrictGuide />
      </div>

      <HowItWorksAndPricing />

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <div className="text-xl font-bold gradient-text">X68</div>
              <div className="text-sm text-slate-600 mt-1">New Economic Verse</div>
            </div>
            <div className="flex gap-8 text-sm text-slate-500">
              <Link href="/developer"              className="hover:text-cyan-400 transition-colors">Developer API</Link>
              <Link href="/humans"                 className="hover:text-cyan-400 transition-colors">Experts</Link>
              <Link href="/citizen/register"       className="hover:text-cyan-400 transition-colors">Join Free</Link>
              <a href="mailto:admin@aceecotopia.com" className="hover:text-cyan-400 transition-colors">Contact</a>
              <Link href="/admin" className="hover:text-slate-400 transition-colors text-slate-700">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
