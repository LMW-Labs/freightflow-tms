'use client'

import { useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Camera, Check, Loader2, RotateCcw, Upload } from 'lucide-react'
import Link from 'next/link'
import { DocumentType } from '@/lib/types/database'

function ScanPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const loadId = searchParams.get('load')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<DocumentType>('pod')
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setFile(null)
    fileInputRef.current?.click()
  }

  const handleUpload = async () => {
    if (!file || !loadId) return
    setUploading(true)

    try {
      // Get current location
      let lat = null, lng = null
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        }).catch(() => null)
        if (position) {
          lat = position.coords.latitude
          lng = position.coords.longitude
        }
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('load_id', loadId)
      formData.append('type', docType)
      if (lat) formData.append('lat', lat.toString())
      if (lng) formData.append('lng', lng.toString())

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      setSuccess(true)
      setTimeout(() => {
        router.push('/driver')
      }, 1500)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload document. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex p-4 bg-green-100 rounded-full mb-4">
            <Check className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-green-600">Document Uploaded!</h1>
          <p className="text-gray-500 mt-2">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/20">
            <Link href="/driver">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <h1 className="text-white font-bold">Scan Document</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Camera View / Preview */}
      <div className="pt-20 pb-48 flex items-center justify-center min-h-screen p-4">
        {capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured document"
            className="max-w-full max-h-[60vh] rounded-lg shadow-2xl"
          />
        ) : (
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 text-center">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Tap to capture document</p>
                <p className="text-gray-400 text-sm mt-1">Use camera or select from gallery</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t space-y-4">
        {capturedImage ? (
          <>
            {/* Document Type Selector */}
            <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pod">Proof of Delivery (POD)</SelectItem>
                <SelectItem value="bol">Bill of Lading (BOL)</SelectItem>
                <SelectItem value="invoice">Carrier Invoice</SelectItem>
                <SelectItem value="other">Other Document</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={handleRetake}
                disabled={uploading}
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Retake
              </Button>
              <Button
                className="flex-1 h-12"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5 mr-2" />
                )}
                Upload
              </Button>
            </div>
          </>
        ) : (
          <Button
            className="w-full h-14 text-lg"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-5 w-5 mr-2" />
            Open Camera
          </Button>
        )}
      </div>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <ScanPageContent />
    </Suspense>
  )
}
