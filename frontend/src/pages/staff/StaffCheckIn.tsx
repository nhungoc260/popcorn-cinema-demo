import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, QrCode, Search, CheckCircle, XCircle, Calendar, Clock, MapPin, Ticket, Camera, CameraOff, Zap } from 'lucide-react'
import { bookingApi } from '../../api'
import toast from 'react-hot-toast'

const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

// Extract booking code từ QR data (có thể là raw code hoặc URL)
function extractCode(raw: string): string {
  const s = raw.trim()
  // Nếu là URL chứa bookingCode
  try {
    const url = new URL(s)
    const code = url.searchParams.get('code') || url.searchParams.get('bookingCode')
    if (code) return code.toUpperCase()
  } catch {}
  // Lấy phần cuối path nếu là URL
  if (s.startsWith('http')) {
    const parts = s.split('/')
    return parts[parts.length - 1].toUpperCase()
  }
  // Raw booking code
  return s.toUpperCase()
}

export default function StaffCheckIn() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{ success: boolean; data?: any; message?: string } | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanCount, setScanCount] = useState(0) // để re-trigger scan loop
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef<number>(0)
  const jsQRRef = useRef<any>(null)
  const detectorRef = useRef<any>(null)
  const processingRef = useRef(false)

  // Load jsQR - primary QR scanner
  useEffect(() => {
    if ((window as any).jsQR) {
      jsQRRef.current = (window as any).jsQR
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'
    script.async = true
    script.onload = () => {
      jsQRRef.current = (window as any).jsQR
      console.log('✅ jsQR loaded')
    }
    script.onerror = () => {
      // Fallback CDN
      const s2 = document.createElement('script')
      s2.src = 'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js'
      s2.async = true
      s2.onload = () => { jsQRRef.current = (window as any).jsQR }
      document.head.appendChild(s2)
    }
    document.head.appendChild(script)
    return () => { try { document.head.removeChild(script) } catch {} }
  }, [])

  // Init BarcodeDetector (native browser API - fastest)
  useEffect(() => {
    if ('BarcodeDetector' in window) {
      try {
        detectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      } catch {}
    }
  }, [])

  const { mutate: checkIn, isPending } = useMutation({
    mutationFn: (bookingCode: string) => bookingApi.checkIn(bookingCode),
    onSuccess: ({ data }) => {
      setResult({ success: true, data: data.data })
      toast.success('✅ Check-in thành công!')
      setCode('')
      processingRef.current = false
      stopCamera()
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Mã vé không hợp lệ hoặc chưa thanh toán'
      setResult({ success: false, message: msg })
      toast.error(msg)
      processingRef.current = false
      // Cho phép scan lại sau 2s
      setTimeout(() => {
        setScanning(true)
        setScanCount(c => c + 1)
      }, 2000)
    },
  })

  const handleCodeFound = useCallback((raw: string) => {
    if (processingRef.current) return
    const extracted = extractCode(raw)
    if (!extracted || extracted.length < 3) return
    processingRef.current = true
    setScanning(false)
    setCode(extracted)
    setResult(null)
    checkIn(extracted)
  }, [checkIn])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setResult(null)
    processingRef.current = false
    checkIn(extractCode(code.trim()))
  }

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOn(false)
    setScanning(false)
    processingRef.current = false
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError('')
    processingRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
      setScanning(true)
      setScanCount(c => c + 1)
    } catch {
      setCameraError('Không thể truy cập camera. Hãy cấp quyền camera cho trình duyệt.')
      toast.error('Không thể mở camera!')
    }
  }, [])

  // QR Scan loop - jsQR primary (most compatible), BarcodeDetector fallback
  useEffect(() => {
    if (!cameraOn || !scanning) return
    let stopped = false
    let frameCount = 0

    const scan = async () => {
      if (stopped || processingRef.current) return
      frameCount++

      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) {
        if (!stopped) animRef.current = requestAnimationFrame(scan)
        return
      }
      // Wait until video has data
      if (video.readyState < 2 || video.videoWidth === 0) {
        if (!stopped) animRef.current = requestAnimationFrame(scan)
        return
      }

      // Scan every 3 frames to reduce CPU load
      if (frameCount % 3 !== 0) {
        if (!stopped) animRef.current = requestAnimationFrame(scan)
        return
      }

      // Method 1: jsQR (most compatible - works Chrome/Firefox/Edge/Safari)
      if (jsQRRef.current) {
        try {
          const w = video.videoWidth
          const h = video.videoHeight
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h)
            const imageData = ctx.getImageData(0, 0, w, h)
            const qr = jsQRRef.current(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            })
            if (qr?.data) {
              handleCodeFound(qr.data)
              return
            }
          }
        } catch {}
      }

      // Method 2: BarcodeDetector (Chrome native, faster when available)
      if (detectorRef.current) {
        try {
          const barcodes = await detectorRef.current.detect(video)
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            handleCodeFound(barcodes[0].rawValue)
            return
          }
        } catch {}
      }

      if (!stopped) animRef.current = requestAnimationFrame(scan)
    }

    animRef.current = requestAnimationFrame(scan)
    return () => {
      stopped = true
      cancelAnimationFrame(animRef.current)
    }
  }, [cameraOn, scanning, scanCount, handleCodeFound])

  useEffect(() => () => stopCamera(), [stopCamera])

  const b = result?.data as any
  const hasBarcodeDetector = 'BarcodeDetector' in window

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="border-b border-b px-6 py-4 flex items-center gap-3"
        style={{ background: 'var(--color-bg-2)', backdropFilter: 'blur(12px)', borderColor: 'rgba(168,85,247,0.1)' }}>
        <Link to="/"><ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} /></Link>
        <QrCode className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
        <div>
          <h1 className="font-display font-bold leading-tight" style={{ color: 'var(--color-text)' }}>Check-in Vé</h1>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {hasBarcodeDetector ? '⚡ Native scanner' : '📷 jsQR scanner'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cameraOn ? 'animate-pulse' : ''}`}
            style={{ background: cameraOn ? '#22C55E' : '#64748B' }} />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {scanning ? '🔍 Đang quét' : cameraOn ? '⏸ Tạm dừng' : 'Camera tắt'}
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Camera View */}
          <div className="mb-5 rounded-3xl overflow-hidden relative"
            style={{ background: 'var(--color-bg-2)', border: `2px solid ${cameraOn ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.15)'}`, minHeight: 300, transition: 'border-color 0.3s' }}>

            <video ref={videoRef} className="w-full rounded-3xl"
              style={{ display: cameraOn ? 'block' : 'none', maxHeight: 360, objectFit: 'cover' }}
              muted playsInline />
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera OFF */}
            {!cameraOn && (
              <div className="flex flex-col items-center justify-center py-14 px-6">
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
                  className="w-24 h-24 mx-auto mb-5 rounded-3xl flex items-center justify-center"
                  style={{ background: 'rgba(168,85,247,0.08)', border: '2px solid rgba(168,85,247,0.25)' }}>
                  <Camera className="w-12 h-12" style={{ color: 'var(--color-primary)' }} />
                </motion.div>
                <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Quét QR để Check-in</p>
                <p className="text-xs text-center mb-5" style={{ color: 'var(--color-text-muted)' }}>
                  Bật camera → Hướng vào mã QR trên vé → Tự động check-in ngay
                </p>
                {cameraError && <p className="text-xs text-center mb-4 px-4" style={{ color: '#F87171' }}>{cameraError}</p>}
                <motion.button onClick={startCamera}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }}>
                  <Camera className="w-5 h-5" /> Bật Camera
                </motion.button>
              </div>
            )}

            {/* Camera ON overlay */}
            {cameraOn && (
              <>
                {/* Dark edges vignette */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />

                {/* QR frame */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-52 h-52">
                    {/* Corners */}
                    {[
                      'top-0 left-0 border-t-4 border-l-4 rounded-tl-xl',
                      'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl',
                      'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl',
                      'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl',
                    ].map((cls, i) => (
                      <div key={i} className={`absolute w-10 h-10 ${cls}`}
                        style={{ borderColor: scanning ? 'var(--color-primary)' : '#22C55E' }} />
                    ))}

                    {/* Scan line */}
                    {scanning && (
                      <motion.div
                        animate={{ top: ['8%', '92%', '8%'] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute left-2 right-2 h-0.5 rounded-full"
                        style={{ background: 'linear-gradient(90deg, transparent, var(--color-primary), var(--color-primary), transparent)', boxShadow: '0 0 12px 2px rgba(34,211,238,0.8)' }}
                      />
                    )}

                    {/* Processing indicator */}
                    {!scanning && processingRef.current && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: '#FDE68A', borderTopColor: 'transparent' }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between"
                  style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                  <span className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ background: scanning ? 'rgba(168,85,247,0.15)' : 'rgba(253,230,138,0.2)', color: scanning ? 'var(--color-primary)' : '#FDE68A', border: `1px solid ${scanning ? 'rgba(168,85,247,0.4)' : 'rgba(253,230,138,0.4)'}` }}>
                    {scanning ? '🔍 Đang quét QR...' : '⏳ Đang xử lý vé...'}
                  </span>
                  <button onClick={stopCamera}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                    style={{ background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.4)', color: '#F87171' }}>
                    <CameraOff className="w-3.5 h-3.5" /> Tắt
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Manual input */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>hoặc nhập mã thủ công</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-dim)' }} />
                  <input type="text" value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="PC..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono outline-none uppercase"
                    style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)', color: 'var(--color-text)', letterSpacing: '0.1em' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'}
                  />
                </div>
                <motion.button type="submit" disabled={isPending || !code.trim()}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="px-5 py-3 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                  {isPending ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-bg)', borderTopColor: 'transparent' }} />
                    : <><Search className="w-4 h-4" /> Check</>}
                </motion.button>
              </div>
            </form>
          </div>

          {/* Result */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div key={result.success ? 'ok' : 'fail'}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-3xl overflow-hidden"
                style={{ border: `2px solid ${result.success ? 'rgba(168,85,247,0.5)' : 'rgba(248,113,113,0.5)'}` }}>

                <div className="px-5 py-4 flex items-center gap-3"
                  style={{ background: result.success ? 'rgba(168,85,247,0.12)' : 'rgba(248,113,113,0.12)' }}>
                  {result.success
                    ? <CheckCircle className="w-7 h-7 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                    : <XCircle className="w-7 h-7 flex-shrink-0" style={{ color: '#F87171' }} />}
                  <div>
                    <div className="font-bold" style={{ color: result.success ? 'var(--color-primary)' : '#F87171' }}>
                      {result.success ? '✅ Check-in Thành Công!' : '❌ Không thể check-in'}
                    </div>
                    {!result.success && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{result.message}</div>
                    )}
                  </div>
                </div>

                {b && (
                  <div className="px-5 py-4 space-y-3" style={{ background: 'var(--color-bg-2)' }}>
                    <div className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
                      🎬 {b.showtime?.movie?.title}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        { icon: Calendar, label: 'Ngày', v: b.showtime?.startTime ? fmtDate(b.showtime.startTime) : '—' },
                        { icon: Clock, label: 'Giờ', v: b.showtime?.startTime ? fmtTime(b.showtime.startTime) : '—' },
                        { icon: MapPin, label: 'Rạp', v: b.showtime?.theater?.name || '—' },
                        { icon: Ticket, label: 'Ghế', v: b.seatLabels?.join(', ') || '—' },
                      ].map(({ icon: Icon, label, v }) => (
                        <div key={label} className="flex items-center gap-2 p-2 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                          <div>
                            <div className="text-xs" style={{ color: 'var(--color-text-dim)' }}>{label}</div>
                            <div className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{v}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-3 py-2 rounded-xl text-xs font-mono text-center"
                      style={{ background: 'rgba(168,85,247,0.08)', color: 'var(--color-primary)' }}>
                      {b.bookingCode}
                    </div>
                    <button onClick={() => { setResult(null); processingRef.current = false; startCamera() }}
                      className="w-full py-3 rounded-xl text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'white' }}>
                      📷 Quét Vé Tiếp Theo
                    </button>
                  </div>
                )}

                {!result.success && (
                  <div className="px-5 py-3" style={{ background: 'var(--color-bg-2)' }}>
                    <button onClick={() => { setResult(null); processingRef.current = false; setScanning(true); setScanCount(c => c+1) }}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171' }}>
                      🔄 Thử lại
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
