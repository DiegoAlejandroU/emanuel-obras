import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { usuarioActualDesdeToken } from '../lib/auth.js'
import GraficaAvanceHistorico from '../components/GraficaAvanceHistorico.jsx'
import GraficaAvancePorActividad from '../components/GraficaAvancePorActividad.jsx'

const ROLES_CON_REPORTES = ['administrador', 'gerencia', 'interventor']

export default function Dashboard() {
  const [obras, setObras] = useState([])
  const [obraId, setObraId] = useState(null)
  const [indicadores, setIndicadores] = useState(null)
  const [historico, setHistorico] = useState([])
  const [alertas, setAlertas] = useState([])
  const [error, setError] = useState(null)
  const [descargando, setDescargando] = useState(null)

  const usuario = usuarioActualDesdeToken()
  const puedeVerReportes = usuario && ROLES_CON_REPORTES.includes(usuario.rol)
  const obraSeleccionada = obras.find((o) => String(o.id) === String(obraId))

  useEffect(() => {
    api.listarObras().then(setObras).catch(() => setError('No se pudo conectar con la API. ¿Está corriendo el backend?'))
  }, [])

  useEffect(() => {
    if (!obraId) return
    api.indicadoresObra(obraId).then(setIndicadores).catch(() => setError('No se pudieron cargar los indicadores de la obra.'))
    api.listarAlertas(obraId).then(setAlertas).catch(() => setError('No se pudieron cargar las alertas de la obra.'))
    api.historicoAvanceObra(obraId).then(setHistorico).catch(() => setError('No se pudo cargar el histórico de avance de la obra.'))
  }, [obraId])

  async function resolver(alerta) {
    try {
      await api.resolverAlerta(alerta.id)
      setAlertas((prev) => prev.map((a) => (a.id === alerta.id ? { ...a, estado: 'resuelta' } : a)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function descargarReporte(formato) {
    if (!obraSeleccionada) return
    setDescargando(formato)
    setError(null)
    try {
      if (formato === 'pdf') {
        await api.descargarReportePdf(obraSeleccionada.id, obraSeleccionada.nombre)
      } else {
        await api.descargarReporteXlsx(obraSeleccionada.id, obraSeleccionada.nombre)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setDescargando(null)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Indicadores de avance</h2>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          className="border border-gray-300 rounded-md px-3 py-2"
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

        {puedeVerReportes && obraSeleccionada && (
          <>
            <button
              className="text-sm border border-obra-600 text-obra-700 rounded-md px-3 py-2 hover:bg-obra-50 disabled:opacity-50"
              disabled={descargando !== null}
              onClick={() => descargarReporte('pdf')}
            >
              {descargando === 'pdf' ? 'Generando PDF…' : 'Descargar reporte PDF'}
            </button>
            <button
              className="text-sm border border-obra-600 text-obra-700 rounded-md px-3 py-2 hover:bg-obra-50 disabled:opacity-50"
              disabled={descargando !== null}
              onClick={() => descargarReporte('xlsx')}
            >
              {descargando === 'xlsx' ? 'Generando Excel…' : 'Descargar reporte Excel'}
            </button>
          </>
        )}
      </div>

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
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Avance en el tiempo</h3>
            <GraficaAvanceHistorico puntos={historico} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Avance por actividad</h3>
            <GraficaAvancePorActividad actividades={indicadores.actividades} />
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
