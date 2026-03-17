import { useEffect, useRef, useState } from 'react'
import { GlobalWorkerOptions, getDocument as pdfGetDocument } from 'pdfjs-dist'

GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

const OCR_DPI = 144
const PDF_DPI  = 72

function drawHighlight(hlCanvas, viewport, posArr) {
  const ctx = hlCanvas.getContext('2d')
  ctx.clearRect(0, 0, hlCanvas.width, hlCanvas.height)
  if (!posArr || posArr.length < 8) return

  const dpiScale = PDF_DPI / OCR_DPI
  // PDF 坐标原点在左下角，Y 向上；OCR 坐标原点在左上角，Y 向下
  // 需要翻转 Y 轴：pdf_y = pageHeight - ocr_y * dpiScale
  const pageHeightPt = viewport.viewBox[3]
  const pts = []
  for (let i = 0; i < 8; i += 2) {
    const pdf_x = posArr[i]     * dpiScale
    const pdf_y = pageHeightPt - posArr[i + 1] * dpiScale
    const [vx, vy] = viewport.convertToViewportPoint(pdf_x, pdf_y)
    pts.push([vx, vy])
  }

  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  pts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y))
  ctx.closePath()
  ctx.fillStyle   = 'rgba(255, 200, 0, 0.35)'
  ctx.strokeStyle = 'rgba(212, 168, 67, 0.85)'
  ctx.lineWidth   = 2
  ctx.fill()
  ctx.stroke()
}

export default function PDFViewer({ pdfArrayBuffer, target }) {
  const canvasRef    = useRef(null)
  const hlCanvasRef  = useRef(null)
  const scrollRef    = useRef(null)
  const pdfDocRef    = useRef(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages,  setTotalPages]  = useState(0)
  const [scale, setScale]             = useState(1.3)
  const [rendering, setRendering]     = useState(false)

  // Load PDF
  useEffect(() => {
    if (!pdfArrayBuffer) return
    let cancelled = false
    async function load() {
      try {
        const data = new Uint8Array(pdfArrayBuffer)
        const doc  = await pdfGetDocument({ data }).promise
        if (cancelled) return
        pdfDocRef.current = doc
        setTotalPages(doc.numPages)
        setCurrentPage(1)
      } catch (e) {
        console.error('PDF load error:', e)
      }
    }
    load()
    return () => { cancelled = true }
  }, [pdfArrayBuffer])

  // Render page
  useEffect(() => {
    if (!pdfDocRef.current) return
    let cancelled = false
    async function render() {
      setRendering(true)
      try {
        const page     = await pdfDocRef.current.getPage(currentPage)
        const viewport = page.getViewport({ scale })
        const canvas   = canvasRef.current
        const hlCanvas = hlCanvasRef.current
        if (!canvas || !hlCanvas || cancelled) return

        canvas.width  = viewport.width
        canvas.height = viewport.height
        hlCanvas.width  = viewport.width
        hlCanvas.height = viewport.height

        const ctx = canvas.getContext('2d')
        await page.render({ canvasContext: ctx, viewport }).promise
        if (cancelled) return

        // Draw highlight if on same page
        if (target && target.page === currentPage && target.position) {
          drawHighlight(hlCanvas, viewport, target.position)
        } else {
          hlCanvas.getContext('2d').clearRect(0, 0, hlCanvas.width, hlCanvas.height)
        }
      } catch (e) {
        console.error('PDF render error:', e)
      } finally {
        if (!cancelled) setRendering(false)
      }
    }
    render()
    return () => { cancelled = true }
  }, [currentPage, scale, pdfDocRef.current, target])

  // Jump to target page
  useEffect(() => {
    if (!target) return
    if (target.page !== currentPage) {
      setCurrentPage(target.page)
    }
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [target])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Controls */}
      <div className="flex-none flex items-center justify-between px-4 py-2 bg-white border-b border-slate-100">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
            aria-label="上一页"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-sm text-slate-600 min-w-[72px] text-center tabular-nums">
            {currentPage} / {totalPages || '—'}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
            aria-label="下一页"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)))}
            className="p-1.5 rounded hover:bg-slate-100 cursor-pointer transition-colors"
            aria-label="缩小"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
          <span className="text-xs text-slate-500 min-w-[44px] text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.min(3, +(s + 0.2).toFixed(1)))}
            className="p-1.5 rounded hover:bg-slate-100 cursor-pointer transition-colors"
            aria-label="放大"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          {rendering && (
            <span className="ml-1">
              <svg className="w-3.5 h-3.5 text-slate-400 spinner" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 flex justify-center items-start bg-slate-100">
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <canvas ref={canvasRef} style={{ display: 'block', boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }} />
          <canvas
            ref={hlCanvasRef}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          />
        </div>
      </div>
    </div>
  )
}
