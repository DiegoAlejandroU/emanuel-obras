import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

export default function Dashboard() {
  const [obras, setObras] = useState([])
  const [obraId, setObraId] = useState(null)
  const [indicadores, setIndicadores] = useState(null)
  const [alertas, setAlertas] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    api.listarObras().then(setObras).catch(() => setError('No se pudo conectar con la API. ¿Está corriendo el backend?'))
  }, [])

  useEffect(() => {
    if (!obraId) return
    api.indicadoresObra(obraId).then(setIndicadores).catch(() => setError('No se pudieron cargar los indicadores de la obra.'))
    api.listarAlertas(obraId).then(setAlertas).catch(() => setError('No se pudieron cargar las alertas de la obra.'))
  }, [obraId])

  async function resolver(alerta) {
    try {
      await api.resolverAlerta(alerta.id)
      setAlertas((prev) => prev.map((a) => (a.id === alerta.id ? { ...a, estado: 'resuelta' } : a)))
    } catch (err) {
      setError(err.message)
    }
  }

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
              <p className="text-sm text-gray-500">Avance físico</p>
              <p className="text-2xl font-bold text-obra-700">{indicadores.avance_fisico_porcentual}%</p>
            </div>
            <div className="bg-obra-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Avance financiero</p>
              <p className="text-2xl font-bold text-obra-700">{indicadores.avance_financiero_porcentual}%</p>
            </div>
            <div className="bg-obra-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Presupuesto total</p>
              <p className="text-2xl font-bold text-obra-700">
                ${indicadores.presupuesto_total.toLocaleString('es-CO')}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Avance por actividad</h3>
            <div className="space-y-2">
              {indicadores.actividades.map((a) => (
                <div key={a.actividad_id}>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>
                      {a.nombre} <span className="text-gray-400">(peso {Math.round(a.peso_porcentual * 100)}%)</span>
                    </span>
                    <span>{a.avance_acumulado_porcentual}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-obra-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, a.avance_acumulado_porcentual)}%` }}
                    />
                  </div>
                </div>
              ))}
              {indicadores.actividades.length === 0 && (
                <p className="text-sm text-gray-500">Esta obra no tiene actividades definidas.</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Alertas</h3>
            <div className="space-y-2">
              {alertas.map((a) => (
                <div
                  key={a.id}
                  className={`border rounded-md p-3 flex items-center justify-between ${
                    a.estado === 'activa' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.tipo.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-600">{a.mensaje}</p>
                  </div>
                  {a.estado === 'activa' && (
                    <button className="text-sm text-obra-700 hover:underline" onClick={() => resolver(a)}>
                      Marcar resuelta
                    </button>
                  )}
                </div>
              ))}
              {alertas.length === 0 && <p className="text-sm text-gray-500">Sin alertas para esta obra.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
