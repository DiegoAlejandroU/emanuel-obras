import { useMemo, useRef, useState } from 'react'

const COLOR_FISICO = '#2f7d3a' // obra-600
const COLOR_FINANCIERO = '#2563eb'

const ANCHO = 720
const ALTO = 260
const MARGEN = { top: 16, right: 56, bottom: 28, left: 36 }
const ANCHO_TRAZO = ANCHO - MARGEN.left - MARGEN.right
const ALTO_TRAZO = ALTO - MARGEN.top - MARGEN.bottom

function formatearFecha(fechaStr) {
  const [anio, mes, dia] = fechaStr.split('-')
  return `${dia}/${mes}/${anio}`
}

/**
 * Curva de avance acumulado en el tiempo (físico vs. financiero).
 * Recibe `puntos`: [{ fecha: 'YYYY-MM-DD', avance_fisico_porcentual, avance_financiero_porcentual }]
 */
export default function GraficaAvanceHistorico({ puntos }) {
  const svgRef = useRef(null)
  const [indiceActivo, setIndiceActivo] = useState(null)

  const datos = useMemo(() => {
    if (!puntos || puntos.length < 2) return null

    const fechasMs = puntos.map((p) => new Date(p.fecha + 'T00:00:00').getTime())
    const minMs = Math.min(...fechasMs)
    const maxMs = Math.max(...fechasMs)
    const rangoMs = maxMs - minMs || 1

    const escalaX = (ms) => MARGEN.left + ((ms - minMs) / rangoMs) * ANCHO_TRAZO
    const escalaY = (valor) => MARGEN.top + ALTO_TRAZO - (Math.min(100, Math.max(0, valor)) / 100) * ALTO_TRAZO

    const puntosXY = puntos.map((p, i) => ({
      ...p,
      x: escalaX(fechasMs[i]),
      yFisico: escalaY(p.avance_fisico_porcentual),
      yFinanciero: escalaY(p.avance_financiero_porcentual),
    }))

    const lineaFisico = puntosXY.map((p) => `${p.x},${p.yFisico}`).join(' ')
    const lineaFinanciero = puntosXY.map((p) => `${p.x},${p.yFinanciero}`).join(' ')
    const areaFisico = `${MARGEN.left},${MARGEN.top + ALTO_TRAZO} ${lineaFisico} ${
      puntosXY[puntosXY.length - 1].x
    },${MARGEN.top + ALTO_TRAZO}`

    return { puntosXY, lineaFisico, lineaFinanciero, areaFisico }
  }, [puntos])

  if (!datos) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
        Aún no hay suficientes bitácoras aprobadas para trazar la curva de avance en el tiempo (se necesitan al
        menos dos fechas distintas).
      </div>
    )
  }

  const { puntosXY, lineaFisico, lineaFinanciero, areaFisico } = datos
  const activo = indiceActivo !== null ? puntosXY[indiceActivo] : null

  function manejarMovimiento(e) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const xCursor = ((e.clientX - rect.left) / rect.width) * ANCHO
    let mejorIndice = 0
    let mejorDistancia = Infinity
    puntosXY.forEach((p, i) => {
      const d = Math.abs(p.x - xCursor)
      if (d < mejorDistancia) {
        mejorDistancia = d
        mejorIndice = i
      }
    })
    setIndiceActivo(mejorIndice)
  }

  const gridY = [0, 25, 50, 75, 100]

  return (
    <div className="relative">
      <div className="flex items-center gap-5 mb-1 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 rounded-full" style={{ backgroundColor: COLOR_FISICO }} />
          Avance físico
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 rounded-full" style={{ backgroundColor: COLOR_FINANCIERO }} />
          Avance financiero
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="w-full h-auto touch-none"
        onMouseMove={manejarMovimiento}
        onMouseLeave={() => setIndiceActivo(null)}
      >
        {gridY.map((v) => {
          const y = MARGEN.top + ALTO_TRAZO - (v / 100) * ALTO_TRAZO
          return (
            <g key={v}>
              <line x1={MARGEN.left} y1={y} x2={ANCHO - MARGEN.right} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={MARGEN.left - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#9ca3af">
                {v}%
              </text>
            </g>
          )
        })}

        <polygon points={areaFisico} fill={COLOR_FISICO} fillOpacity={0.1} stroke="none" />

        <polyline
          points={lineaFinanciero}
          fill="none"
          stroke={COLOR_FINANCIERO}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={lineaFisico}
          fill="none"
          stroke={COLOR_FISICO}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {(() => {
          const ultimo = puntosXY[puntosXY.length - 1]
          return (
            <g>
              <circle cx={ultimo.x} cy={ultimo.yFisico} r={4} fill={COLOR_FISICO} stroke="white" strokeWidth={2} />
              <text x={ultimo.x - 6} y={ultimo.yFisico - 8} textAnchor="end" fontSize={11} fill="#374151" fontWeight={600}>
                {ultimo.avance_fisico_porcentual}%
              </text>
              <circle
                cx={ultimo.x}
                cy={ultimo.yFinanciero}
                r={4}
                fill={COLOR_FINANCIERO}
                stroke="white"
                strokeWidth={2}
              />
              <text
                x={ultimo.x - 6}
                y={ultimo.yFinanciero + 14}
                textAnchor="end"
                fontSize={11}
                fill="#374151"
                fontWeight={600}
              >
                {ultimo.avance_financiero_porcentual}%
              </text>
            </g>
          )
        })()}

        {activo && (
          <g>
            <line
              x1={activo.x}
              y1={MARGEN.top}
              x2={activo.x}
              y2={MARGEN.top + ALTO_TRAZO}
              stroke="#9ca3af"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <circle cx={activo.x} cy={activo.yFisico} r={5} fill={COLOR_FISICO} stroke="white" strokeWidth={2} />
            <circle cx={activo.x} cy={activo.yFinanciero} r={5} fill={COLOR_FINANCIERO} stroke="white" strokeWidth={2} />
          </g>
        )}
      </svg>

      {activo && (
        <div
          className="absolute top-0 bg-white border border-gray-200 rounded-md shadow-md px-3 py-2 text-xs pointer-events-none"
          style={{
            left: `${Math.min(88, Math.max(0, (activo.x / ANCHO) * 100))}%`,
            transform: activo.x > ANCHO * 0.7 ? 'translateX(-105%)' : 'translateX(8px)',
          }}
        >
          <p className="font-semibold text-gray-800 mb-1">{formatearFecha(activo.fecha)}</p>
          <p className="text-gray-700 flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 rounded-full" style={{ backgroundColor: COLOR_FISICO }} />
            <span className="font-medium">{activo.avance_fisico_porcentual}%</span> avance físico
          </p>
          <p className="text-gray-700 flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 rounded-full" style={{ backgroundColor: COLOR_FINANCIERO }} />
            <span className="font-medium">{activo.avance_financiero_porcentual}%</span> avance financiero
          </p>
        </div>
      )}
    </div>
  )
}
