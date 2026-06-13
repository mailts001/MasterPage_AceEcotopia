import Link from 'next/link'

export default function UpgradeSuccess() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Welcome, <span className="gradient-text">Citizen</span>
        </h1>
        <p className="text-gray-400 mb-2">Your subscription is active.</p>
        <p className="text-gray-500 text-sm mb-8">
          Your tier has been upgraded and Nexus Credits have been added to your account.
        </p>
        <Link
          href="/citizen/dashboard"
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 py-3 rounded-xl transition inline-block"
        >
          Go to Dashboard →
        </Link>
      </div>
    </div>
  )
}
