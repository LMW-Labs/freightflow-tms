import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Package, MapPin, Users, ArrowRight, Brain, TrendingUp, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="VectrLoadAI Logo"
              width={140}
              height={140}
              className="rounded-2xl"
            />
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-4">
            VectrLoad<span className="text-blue-400">AI</span>
          </h1>
          <p className="text-lg text-blue-300 mb-2 font-medium">Intelligent Freight Management</p>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            AI-powered transportation management system for freight brokers.
            Optimize margins, automate operations, and give your customers real-time visibility.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white" asChild>
              <Link href="/login">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent text-white border-slate-500 hover:bg-white/10" asChild>
              <Link href="/driver">
                Driver Login
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* AI Features Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Brain className="h-6 w-6 text-blue-400" />
            <span className="text-blue-300 font-semibold">AI-Powered Intelligence</span>
          </div>
          <p className="text-slate-300">
            Smart rate suggestions, automated document processing, and intelligent carrier matching coming soon
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-white">
            <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4">
              <Package className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Load Management</h3>
            <p className="text-slate-400">
              Create and manage loads with full details - origin, destination, rates, and documents.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-white">
            <div className="p-3 bg-green-500/20 rounded-xl w-fit mb-4">
              <MapPin className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Real-Time Tracking</h3>
            <p className="text-slate-400">
              GPS tracking with live map updates, ETA predictions, and Macropoint integration.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-white">
            <div className="p-3 bg-purple-500/20 rounded-xl w-fit mb-4">
              <Users className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Customer Portals</h3>
            <p className="text-slate-400">
              Auto-generated branded portals for each customer to track their shipments.
            </p>
          </div>
        </div>

        {/* Second row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-white">
            <div className="p-3 bg-yellow-500/20 rounded-xl w-fit mb-4">
              <TrendingUp className="h-8 w-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Market Intelligence</h3>
            <p className="text-slate-400">
              DAT and Truckstop rate integrations for real-time market pricing and margin optimization.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-white">
            <div className="p-3 bg-cyan-500/20 rounded-xl w-fit mb-4">
              <Shield className="h-8 w-8 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Carrier Vetting</h3>
            <p className="text-slate-400">
              Highway integration for automatic authority verification, insurance checks, and safety scores.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-white">
            <div className="p-3 bg-pink-500/20 rounded-xl w-fit mb-4">
              <Brain className="h-8 w-8 text-pink-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI Automation</h3>
            <p className="text-slate-400">
              Coming soon: Smart rate suggestions, automated document processing, and intelligent insights.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-400 text-sm">
        <p className="font-medium text-slate-300">VectrLoadAI - Intelligent Freight Management</p>
        <p className="mt-1">Built with Next.js, Supabase, and AI-powered integrations</p>
      </div>
    </div>
  )
}
