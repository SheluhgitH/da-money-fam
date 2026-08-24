'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_MASK = 1280

export default function InpaintCanvas({
  imageUrl,
  aspectRatio,
  onMaskChange,
  onDone,
}: {
  imageUrl: string
  aspectRatio: string
  onMaskChange: (dataUrl: string | null) => void
  onDone?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const onMaskRef = useRef(onMaskChange)
  onMaskRef.current = onMaskChange

  const [tool, setTool] = useState<'brush' | 'eraser' | 'pan'>('brush')
  const [size, setSize] = useState(28)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 24, y: 24 })
  const [stage, setStage] = useState({ w: 360, h: 640 })
  const [spaceDown, setSpaceDown] = useState(false)

  const drawing = useRef(false)
  const panning = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const painted = useRef(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)
  const toolRef = useRef(tool)
  const sizeRef = useRef(size)
  const spaceRef = useRef(spaceDown)
  zoomRef.current = zoom
  panRef.current = pan
  toolRef.current = tool
  sizeRef.current = size
  spaceRef.current = spaceDown

  const ratio = aspectRatio === '16:9' ? 16 / 9 : aspectRatio === '1:1' ? 1 : 9 / 16
  const moving = tool === 'pan' || spaceDown

  const fillBlack = (w: number, h: number) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
  }

  const fitView = useCallback((w: number, h: number) => {
    const vp = viewportRef.current
    const vw = Math.max(vp?.clientWidth || 0, 320)
    const vh = Math.max(vp?.clientHeight || 0, 240)
    const nextZoom = Math.min(vw / w, vh / h) * 0.92
    const clamped = Math.min(4, Math.max(0.08, nextZoom))
    setZoom(clamped)
    setPan({
      x: (vw - w * clamped) / 2,
      y: (vh - h * clamped) / 2,
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const nw = img.naturalWidth || 720
      const nh = img.naturalHeight || Math.round(720 / ratio)
      const long = Math.max(nw, nh) || 1
      const scale = long > MAX_MASK ? MAX_MASK / long : 1
      const w = Math.max(8, Math.round(nw * scale))
      const h = Math.max(8, Math.round(nh * scale))
      setStage({ w, h })
      requestAnimationFrame(() => {
        const canvas = canvasRef.current
        if (!canvas || cancelled) return
        canvas.width = w
        canvas.height = h
        fillBlack(w, h)
        painted.current = false
        onMaskRef.current(null)
        fitView(w, h)
      })
    }
    img.src = imageUrl
    return () => {
      cancelled = true
    }
  }, [imageUrl, ratio, fitView])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return
      e.preventDefault()
      setSpaceDown(e.type === 'keydown')
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [])

  const emit = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !painted.current) {
      onMaskRef.current(null)
      return
    }
    onMaskRef.current(canvas.toDataURL('image/png'))
  }, [])

  const zoomBy = useCallback((factor: number, cx?: number, cy?: number) => {
    const vp = viewportRef.current
    const prev = zoomRef.current || 0.08
    const next = Math.min(6, Math.max(0.08, prev * factor))
    if (!vp) {
      setZoom(next)
      return
    }
    const originX = cx ?? vp.clientWidth / 2
    const originY = cy ?? vp.clientHeight / 2
    const p = panRef.current
    setZoom(next)
    setPan({
      x: originX - ((originX - p.x) / prev) * next,
      y: originY - ((originY - p.y) / prev) * next,
    })
  }, [])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return

    const canvasPos = (e: PointerEvent) => {
      const canvas = canvasRef.current
      if (!canvas || !canvas.width || !canvas.height) return { x: 0, y: 0 }
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height) return { x: 0, y: 0 }
      return {
        x: ((e.clientX - r.left) / r.width) * canvas.width,
        y: ((e.clientY - r.top) / r.height) * canvas.height,
      }
    }

    const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = sizeRef.current
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = toolRef.current === 'eraser' ? '#000' : '#fff'
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
      painted.current = true
    }

    const wantPan = (e: PointerEvent) =>
      toolRef.current === 'pan' ||
      spaceRef.current ||
      e.button === 1 ||
      e.button === 2 ||
      e.buttons === 4 ||
      pointers.current.size >= 2

    const onDown = (e: PointerEvent) => {
      e.preventDefault()
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      try {
        vp.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      if (wantPan(e)) {
        panning.current = true
        drawing.current = false
        const p = panRef.current
        panStart.current = { x: e.clientX, y: e.clientY, px: p.x, py: p.y }
        return
      }
      drawing.current = true
      last.current = canvasPos(e)
    }

    const onMove = (e: PointerEvent) => {
      if (panning.current) {
        e.preventDefault()
        setPan({
          x: panStart.current.px + (e.clientX - panStart.current.x),
          y: panStart.current.py + (e.clientY - panStart.current.y),
        })
        return
      }
      if (!drawing.current || !last.current) return
      e.preventDefault()
      const next = canvasPos(e)
      stroke(last.current, next)
      last.current = next
    }

    const onUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId)
      try {
        vp.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      if (panning.current) {
        panning.current = false
        return
      }
      if (drawing.current) {
        drawing.current = false
        last.current = null
        emit()
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = vp.getBoundingClientRect()
      zoomBy(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - r.left, e.clientY - r.top)
    }

    const onContext = (e: Event) => e.preventDefault()

    const ptrOpts: AddEventListenerOptions = { passive: false }
    vp.addEventListener('pointerdown', onDown, ptrOpts)
    vp.addEventListener('pointermove', onMove, ptrOpts)
    vp.addEventListener('pointerup', onUp, ptrOpts)
    vp.addEventListener('pointercancel', onUp, ptrOpts)
    vp.addEventListener('wheel', onWheel, { passive: false })
    vp.addEventListener('contextmenu', onContext)
    return () => {
      vp.removeEventListener('pointerdown', onDown)
      vp.removeEventListener('pointermove', onMove)
      vp.removeEventListener('pointerup', onUp)
      vp.removeEventListener('pointercancel', onUp)
      vp.removeEventListener('wheel', onWheel)
      vp.removeEventListener('contextmenu', onContext)
    }
  }, [emit, zoomBy])

  const invert = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < data.data.length; i += 4) {
      data.data[i] = 255 - data.data[i]
      data.data[i + 1] = 255 - data.data[i + 1]
      data.data[i + 2] = 255 - data.data[i + 2]
    }
    ctx.putImageData(data, 0, 0)
    painted.current = true
    emit()
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    fillBlack(canvas.width, canvas.height)
    painted.current = false
    onMaskRef.current(null)
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      <div
        ref={viewportRef}
        className={`relative w-full flex-1 min-h-0 overflow-hidden rounded-lg border border-gold/25 bg-[#111] select-none ${
          moving ? 'cursor-grab' : 'cursor-crosshair'
        }`}
        style={{ touchAction: 'none' }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: stage.w,
            height: stage.h,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            pointerEvents: 'none',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="block select-none"
            style={{ width: stage.w, height: stage.h, objectFit: 'fill' }}
          />
          <canvas
            ref={canvasRef}
            width={stage.w}
            height={stage.h}
            className="absolute inset-0 opacity-45 mix-blend-screen"
            style={{ width: stage.w, height: stage.h }}
          />
        </div>
      </div>
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTool('brush')}
          className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border ${
            tool === 'brush' ? 'border-gold text-gold' : 'border-white/15 text-white/50'
          }`}
        >
          Brush
        </button>
        <button
          type="button"
          onClick={() => setTool('eraser')}
          className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border ${
            tool === 'eraser' ? 'border-gold text-gold' : 'border-white/15 text-white/50'
          }`}
        >
          Eraser
        </button>
        <button
          type="button"
          onClick={() => setTool('pan')}
          className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border ${
            tool === 'pan' ? 'border-gold text-gold' : 'border-white/15 text-white/50'
          }`}
        >
          Move
        </button>
        <label className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-white/50">
          Size
          <input
            type="range"
            min={8}
            max={72}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          onClick={() => zoomBy(1.2)}
          className="text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border border-white/15 text-white/50"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.2)}
          className="text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border border-white/15 text-white/50"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => fitView(stage.w, stage.h)}
          className="text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border border-white/15 text-white/50"
        >
          Fit
        </button>
        <button
          type="button"
          onClick={invert}
          className="text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border border-white/15 text-white/50"
        >
          Invert
        </button>
        <button
          type="button"
          onClick={clear}
          className="text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border border-white/15 text-white/50"
        >
          Clear
        </button>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="ml-auto text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border border-gold text-gold"
          >
            Done
          </button>
        ) : null}
      </div>
      <p className="shrink-0 text-[10px] text-white/35">
        Scroll to zoom. Move tool, space, middle-click, or right-drag to pan.
      </p>
    </div>
  )
}
