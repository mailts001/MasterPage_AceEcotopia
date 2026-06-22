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

      {/* All-4-district scroll showcase — pinned, video per district */}
      <DistrictShowcase />

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
