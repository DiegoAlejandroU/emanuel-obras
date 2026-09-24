import { useMemo, useState } from 'react'

const COLOR_BARRA = '#2f7d3a' // obra-600

/**
 * Barras horizontales de avance acumulado por actividad, ordenadas de menor
 * a mayor avance (las más atrasadas primero). Serie única -> sin leyenda.
 */
export default function GraficaAvancePorActividad({ actividades }) {
  const [indiceActivo, setIndiceActivo] = useState(null)

  const ordenadas = useMemo(
    () => [...(actividades || [])].sort((a, b) => a.avance_acumulado_porcentual - b.avance_acumulado_porcentual),
    [actividades]
  )

  if (ordenadas.length === 0) {
    return <p className="text-sm text-gray-500">Esta obra no tiene actividades definidas.</p>
  }

  return (
    <div className="space-y-3">
      {ordenadas.map((a, i) => {
        const valor = Math.min(100, Math.max(0, a.avance_acumulado_porcentual))
        const etiquetaAdentro = valor > 88
        const activo = indiceActivo === i

        return (
          <div
            key={a.actividad_id}
            className="relative"
            tabIndex={0}
            onMouseEnter={() => setIndiceActivo(i)}
            onMouseLeave={() => setIndiceActivo(null)}
            onFocus={() => setIndiceActivo(i)}
            onBlur={() => setIndiceActivo(null)}
          >
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span className="truncate pr-2">
                {a.nombre} <span className="text-gray-400">(peso {Math.round((a.peso_porcentual || 0) * 100)}%)</span>
              </span>
            </div>

            <div className="relative h-4 bg-gray-100 rounded-full">
              <div
                className="h-4 rounded-full transition-[width]"
                style={{ width: `${valor}%`, backgroundColor: COLOR_BARRA }}
              />
              {etiquetaAdentro ? (
                <span
                  className="absolute inset-y-0 flex items-center text-xs font-semibold text-white pr-2"
                  style={{ right: `${100 - valor}%`, left: 0 }}
                >
                  <span className="ml-auto">{a.avance_acumulado_porcentual}%</span>
                </span>
              ) : (
                <span
                  className="absolute inset-y-0 flex items-center text-xs font-medium text-gray-600 pl-2"
                  style={{ left: `${valor}%` }}
                >
                  {a.avance_acumulado_porcentual}%
                </span>
              )}
            </div>

            {activo && (
              <div className="absolute z-10 left-0 -top-1 -translate-y-full bg-white border border-gray-200 rounded-md shadow-md px-3 py-2 text-xs pointer-events-none">
                <p className="font-semibold text-gray-800">{a.nombre}</p>
                <p className="text-gray-600">Peso: {Math.round((a.peso_porcentual || 0) * 100)}%</p>
                <p className="text-gray-600">Avance acumulado: {a.avance_acumulado_porcentual}%</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
