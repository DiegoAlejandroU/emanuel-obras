import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000'

export default function Dashboard() {
  const [obras, setObras] = useState([])
  const [obraId, setObraId] = useState(null)
  const [indicadores, setIndicadores] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/obras/`)
      .then((res) => res.json())
      .then(setObras)
      .catch(() => setError('No se pudo conectar con la API. ¿Está corriendo el backend?'))
  }, [])

  useEffect(() => {
    if (!obraId) return
    fetch(`${API_URL}/dashboard/obra/${obraId}`)
      .then((res) => res.json())
      .then(setIndicadores)
      .catch(() => setError('No se pudieron cargar los indicadores de la obra.'))
  }, [obraId])

  return (
    <div className="max-w-4xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Indicadores de avance</h2>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <select
        className="border border-gray-300 rounded-md px-3 py-2 mb-6"
        value={obraId ?? ''}
        onChange={(e) => setObraId(e.target.value || null)}
      >
        <option value="">Selecciona una obra…</option>
        {obras.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nombre}
          </option>
        ))}
      </select>

      {indicadores && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-obra-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Avance general</p>
              <p className="text-2xl font-bold text-obra-700">
                {indicadores.avance_general_porcentual}%
              </p>
            </div>
            <div className="bg-obra-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Presupuesto total</p>
              <p className="text-2xl font-bold text-obra-700">
                ${indicadores.presupuesto_total.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-obra-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Costo ejecutado (est.)</p>
              <p className="text-2xl font-bold text-obra-700">
                ${indicadores.costo_ejecutado_estimado.toLocaleString('es-CO')}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Avance por actividad</h3>
            <div className="space-y-2">
              {indicadores.actividades.map((a) => (
                <div key={a.actividad_id}>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{a.nombre}</span>
                    <span>{a.avance_porcentual}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-obra-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, a.avance_porcentual)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
