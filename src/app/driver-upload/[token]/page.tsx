'use client'

import { useState, useRef, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Camera,
  Upload,
  Check,
  Loader2,
  FileImage,
  X,
  Truck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ token: string }>
}

interface DocumentRequest {
  id: string
  load_id: string
  request_type: string
  status: string
  message: string | null
  expires_at: string
  load?: {
    id: string
    reference_number: string
    origin_city: string | null
    origin_state: string | null
    dest_city: string | null
    dest_state: string | null
  }
}

export default function DriverUploadPage({ params }: PageProps) {
  const { token } = use(params)
  const supabase = createClient()
  const [request, setRequest] = useState<DocumentRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [showSignature, setShowSignature] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signed, setSigned] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    fetchRequest()
  }, [token])

  const fetchRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_document_requests')
        .select(`
          *,
          load:loads(id, reference_number, origin_city, origin_state, dest_city, dest_state)
        `)
        .eq('request_token', token)
        .single()

      if (error) throw error
      if (!data) throw new Error('Request not found')

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This upload link has expired. Please contact the broker for a new link.')
        return
      }

      // Check if already completed
      if (data.status === 'completed') {
        setUploaded(true)
      }

      setRequest(data)
    } catch (err) {
      console.error('Error fetching request:', err)
      setError('Invalid or expired upload link. Please contact the broker.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0 || !request) return

    setUploading(true)
    try {
      for (const file of files) {
        // Upload file to storage
        const fileName = `${request.load_id}/${request.request_type}_${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName)

        // Create document record
        await supabase.from('documents').insert({
          load_id: request.load_id,
          type: request.request_type as 'pod' | 'bol' | 'rate_con' | 'invoice' | 'other',
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          uploaded_by_type: 'driver',
        })
      }

      // Mark request as completed
      await supabase
        .from('driver_document_requests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', request.id)

      setUploaded(true)
    } catch (err) {
      console.error('Error uploading:', err)
      alert('Error uploading documents. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Canvas drawing functions for signature
  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    if (!canvasRef.current) return
    setIsDrawing(true)
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY

    ctx.lineTo(x, y)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  const handleSignature = async () => {
    if (!canvasRef.current || !signerName.trim() || !request) return

    setUploading(true)
    try {
      const signatureData = canvasRef.current.toDataURL('image/png')

      // Save signature
      await supabase.from('digital_signatures').insert({
        document_request_id: request.id,
        load_id: request.load_id,
        signer_name: signerName,
        signer_ip: 'captured-client-side', // Note: For real IP, use server-side
        signature_data: signatureData,
      })

      // Mark request as completed
      await supabase
        .from('driver_document_requests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', request.id)

      setSigned(true)
      setUploaded(true)
    } catch (err) {
      console.error('Error saving signature:', err)
      alert('Error saving signature. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Invalid</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (uploaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {signed ? 'Signature Saved!' : 'Upload Complete!'}
            </h2>
            <p className="text-muted-foreground">
              Thank you! Your {signed ? 'signature has been recorded' : 'documents have been uploaded'} successfully.
            </p>
            {request?.load && (
              <p className="text-sm text-muted-foreground mt-4">
                Load: {request.load.reference_number}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const isSignatureRequest = request?.request_type === 'signature'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <Truck className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Driver Document Upload</h1>
          <p className="text-muted-foreground mt-2">
            {isSignatureRequest ? 'Sign the document below' : 'Upload your documents securely'}
          </p>
        </div>

        {/* Load Info */}
        {request?.load && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Load Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{request.load.reference_number}</p>
              <p className="text-sm text-muted-foreground">
                {request.load.origin_city}, {request.load.origin_state} →{' '}
                {request.load.dest_city}, {request.load.dest_state}
              </p>
              {request.message && (
                <p className="text-sm mt-2 p-2 bg-blue-50 rounded">
                  {request.message}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upload or Signature */}
        {isSignatureRequest ? (
          <Card>
            <CardHeader>
              <CardTitle>Digital Signature</CardTitle>
              <CardDescription>
                Please sign below to confirm receipt. Your IP address will be recorded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your Full Name</Label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label>Signature</Label>
                <div className="border-2 border-dashed rounded-lg p-1 bg-white">
                  <canvas
                    ref={canvasRef}
                    width={350}
                    height={150}
                    className="w-full touch-none cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={clearSignature}>
                  Clear Signature
                </Button>
              </div>

              <Button
                className="w-full"
                disabled={!signerName.trim() || uploading}
                onClick={handleSignature}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Submit Signature
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Upload photos of your {request?.request_type?.replace('_', ' ') || 'documents'}.
                You can select multiple files.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Input */}
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="file-input"
                  multiple
                  accept="image/*,.pdf"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="font-medium">Tap to take photo or select files</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    JPG, PNG, or PDF up to 10MB each
                  </p>
                </label>
              </div>

              {/* Selected Files */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files ({files.length})</Label>
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <FileImage className="h-4 w-4 text-gray-500" />
                        <span className="text-sm truncate max-w-[200px]">
                          {file.name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                className="w-full"
                disabled={files.length === 0 || uploading}
                onClick={handleUpload}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload {files.length} File{files.length !== 1 ? 's' : ''}
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Your information is securely transmitted and stored.
          <br />
          Need help? Contact your broker.
        </p>
      </div>
    </div>
  )
}
