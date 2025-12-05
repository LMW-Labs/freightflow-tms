import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Truck, Package, MapPin, Users, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur">
              <Truck className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6">
            FreightFlow
          </h1>
          <p className="text-lg text-blue-200 mb-2">A KHCL TMS</p>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10">
            A modern transportation management system for freight brokers.
            Manage loads, track shipments, and give your customers real-time visibility.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/login">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10" asChild>
              <Link href="/driver">
                Driver Login
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-white">
            <div className="p-3 bg-white/20 rounded-xl w-fit mb-4">
              <Package className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Load Management</h3>
            <p className="text-blue-100">
              Create and manage loads with full details - origin, destination, rates, and documents.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-white">
            <div className="p-3 bg-white/20 rounded-xl w-fit mb-4">
              <MapPin className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Real-Time Tracking</h3>
            <p className="text-blue-100">
              GPS tracking from driver phones with live map updates and ETA calculations.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-white">
            <div className="p-3 bg-white/20 rounded-xl w-fit mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Customer Portals</h3>
            <p className="text-blue-100">
              Auto-generated branded portals for each customer to track their shipments.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-blue-200 text-sm">
        <p className="font-medium">FreightFlow - A KHCL TMS</p>
        <p className="mt-1">Built with Next.js, Supabase, and shadcn/ui</p>
      </div>
    </div>
  )
}
