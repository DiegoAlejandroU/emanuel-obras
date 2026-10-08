import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { usuarioActualDesdeToken } from '../lib/auth.js'
import GraficaAvanceHistorico from '../components/GraficaAvanceHistorico.jsx'
import GraficaAvancePorActividad from '../components/GraficaAvancePorActividad.jsx'
import PanelCostos from '../components/PanelCostos.jsx'
import PanelIncidentes from '../components/PanelIncidentes.jsx'
import { fmtCOP } from '../lib/estilos.jsx'

const ROLES_CON_REPORTES = ['administrador', 'gerencia', 'interventor']
const ROLES_GESTION_INCIDENTES = ['administrador', 'residente_obra', 'interventor']

/**
 * `obras`, `obraId` y `onObraIdChange` son opcionales: si no se reciben
 * (por ejemplo si el componente se usara fuera del Layout con sidebar), el
 * componente vuelve a cargar la lista de obras y maneja su propia selección,
 * igual que antes del rediseño.
 */
export default function Dashboard({ obras: obrasProp, obraId: obraIdProp, onObraIdChange }) {
  const [obrasPropias, setObrasPropias] = useState([])
  const [obraIdPropio, setObraIdPropio] = useState(null)
  const [indicadores, setIndicadores] = useState(null)
  const [historico, setHistorico] = useState([])
  const [alertas, setAlertas] = useState([])
  const [incidentes, setIncidentes] = useState([])
  const [error, setError] = useState(null)
  const [descargando, setDescargando] = useState(null)

  const usuario = usuarioActualDesdeToken()
  const puedeVerReportes = usuario && ROLES_CON_REPORTES.includes(usuario.rol)
  const puedeGestionarIncidentes = usuario && ROLES_GESTION_INCIDENTES.includes(usuario.rol)

  const obras = obrasProp ?? obrasPropias
  const obraId = obraIdProp !== undefined ? obraIdProp : obraIdPropio
  const setObraId = onObraIdChange ?? setObraIdPropio
  const obraSeleccionada = obras.find((o) => String(o.id) === String(obraId))

  useEffect(() => {
    if (obrasProp) return
    api.listarObras().then(setObrasPropias).catch(() => setError('No se pudo conectar con la API. ¿Está corriendo el backend?'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!obraId) {
      setIndicadores(null)
      setHistorico([])
      setAlertas([])
      setIncidentes([])
      return
    }
    api.indicadoresObra(obraId).then(setIndicadores).catch(() => setError('No se pudieron cargar los indicadores de la obra.'))
    api.listarAlertas(obraId).then(setAlertas).catch(() => setError('No se pudieron cargar las alertas de la obra.'))
    api.listarIncidentes(obraId).then(setIncidentes).catch(() => setError('No se pudieron cargar los incidentes de la obra.'))
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

  async function actualizarIncidente(incidente, cambios) {
    setError(null)
    try {
      const actualizado = await api.actualizarIncidente(incidente.id, cambios)
      setIncidentes((prev) => prev.map((i) => (i.id === actualizado.id ? actualizado : i)))
      // los contadores de incidentes abiertos/vencidos viven en los indicadores
      api.indicadoresObra(obraId).then(setIndicadores).catch(() => {})
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

  const alertasActivas = alertas.filter((a) => a.estado === 'activa')

  return (
    <div className="p-7 flex flex-col gap-[18px]">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <h1 className="m-0 text-[22px] font-semibold tracking-tight truncate">
            {obraSeleccionada ? obraSeleccionada.nombre : 'Dashboard'}
          </h1>
          <span className="text-muted">
            {obraSeleccionada ? `#${obraSeleccionada.id} · ${obraSeleccionada.ubicacion || 'sin ubicación'}` : 'Indicadores de avance por obra'}
          </span>
        </div>
        {!obrasProp && (
          <select
            className="h-9 border border-line-input rounded-[7px] px-2.5 bg-white outline-none text-sm"
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
        )}
        {puedeVerReportes && obraSeleccionada && (
          <div className="flex gap-2">
            <button
              className="text-sm border border-brand text-brand-text rounded-[7px] px-3 py-2 hover:bg-brand-soft disabled:opacity-50"
              disabled={descargando !== null}
              onClick={() => descargarReporte('pdf')}
            >
              {descargando === 'pdf' ? 'Generando PDF…' : 'Descargar PDF'}
            </button>
            <button
              className="text-sm border border-brand text-brand-text rounded-[7px] px-3 py-2 hover:bg-brand-soft disabled:opacity-50"
              disabled={descargando !== null}
              onClick={() => descargarReporte('xlsx')}
            >
              {descargando === 'xlsx' ? 'Generando Excel…' : 'Descargar Excel'}
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-status-rejected-fg m-0">{error}</p>}

      {!obraId && !error && (
        <div className="bg-white border border-dashed border-line-input rounded-[10px] p-10 text-center text-muted-3">
          Selecciona una obra {obrasProp ? 'en el sidebar' : 'arriba'} para ver sus indicadores.
        </div>
      )}

      {indicadores && (
        <div className="flex flex-col gap-[18px]">
          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div className="bg-white border border-line rounded-[10px] p-[18px] flex flex-col gap-3">
              <span className="text-[12.5px] text-muted font-medium">Avance físico</span>
              <span className="text-[34px] font-semibold tracking-tight leading-none text-brand-text tabular-nums">
                {indicadores.avance_fisico_porcentual}
                <span className="text-lg text-brand-mute2">%</span>
              </span>
              <div className="h-1.5 rounded-full bg-[#ecebe6] overflow-hidden">
                <div
                  className="h-full bg-brand-accent rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, indicadores.avance_fisico_porcentual))}%` }}
                />
              </div>
            </div>
            <div className="bg-white border border-line rounded-[10px] p-[18px] flex flex-col gap-3">
              <span className="text-[12.5px] text-muted font-medium">Avance financiero</span>
              <span className="text-[34px] font-semibold tracking-tight leading-none text-finance-dark tabular-nums">
                {indicadores.avance_financiero_porcentual}
                <span className="text-lg text-finance-mute">%</span>
              </span>
              <div className="h-1.5 rounded-full bg-[#ecebe6] overflow-hidden">
                <div
                  className="h-full bg-finance rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, indicadores.avance_financiero_porcentual))}%` }}
                />
              </div>
            </div>
            <div className="bg-white border border-line rounded-[10px] p-[18px] flex flex-col gap-3">
              <span className="text-[12.5px] text-muted font-medium">Presupuesto total</span>
              <span className="text-[26px] font-semibold tracking-tight leading-none font-mono">
                {fmtCOP(indicadores.presupuesto_total)}
              </span>
            </div>
            <div className="bg-white border border-line rounded-[10px] p-[18px] flex flex-col gap-3">
              <span className="text-[12.5px] text-muted font-medium">Alertas activas</span>
              <span className="text-[34px] font-semibold tracking-tight leading-none text-status-sent-fg tabular-nums">
                {alertasActivas.length}
              </span>
              <span className="text-[12.5px] text-muted">{alertas.length - alertasActivas.length} resueltas · {alertas.length} en total</span>
            </div>
          </div>

          <div className="grid gap-3.5 items-start grid-cols-1 lg:[grid-template-columns:minmax(0,2fr)_minmax(280px,1fr)]">
            <div className="bg-white border border-line rounded-[10px] p-[18px] flex flex-col gap-3">
              <h3 className="m-0 text-sm font-semibold text-ink">Avance en el tiempo</h3>
              <GraficaAvanceHistorico puntos={historico} />
            </div>

            <div className="bg-white border border-line rounded-[10px] flex flex-col">
              <div className="px-[18px] py-3.5 border-b border-line-soft flex justify-between items-center">
                <span className="font-semibold text-sm">Alertas</span>
                <span className="font-mono text-xs text-muted-3">{alertas.length}</span>
              </div>
              <div className="flex flex-col max-h-[280px] overflow-auto">
                {alertas.map((a) => (
                  <div
                    key={a.id}
                    className={`flex gap-2.5 px-[18px] py-3 border-b border-line-softer last:border-b-0 ${
                      a.estado !== 'activa' ? 'opacity-50' : ''
                    }`}
                  >
                    <span
                      className="flex-none w-1.5 h-1.5 rounded-full mt-1.5"
                      style={{ background: a.estado === 'activa' ? '#d14a3c' : '#9a9a92' }}
                    />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="font-medium text-sm capitalize">{a.tipo.replace(/_/g, ' ')}</span>
                      <span className="text-[12.5px] text-muted-2">{a.mensaje}</span>
                      {a.estado === 'activa' && (
                        <button className="text-xs text-brand hover:underline self-start mt-1" onClick={() => resolver(a)}>
                          Marcar resuelta
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {alertas.length === 0 && <p className="text-sm text-muted-3 px-[18px] py-4">Sin alertas para esta obra.</p>}
              </div>
            </div>
          </div>

          <div className="grid gap-3.5 items-start grid-cols-1 lg:[grid-template-columns:minmax(0,3fr)_minmax(320px,2fr)]">
            <PanelCostos indicadores={indicadores} />
            <PanelIncidentes
              incidentes={incidentes}
              puedeGestionar={puedeGestionarIncidentes}
              onActualizar={actualizarIncidente}
            />
          </div>

          <div className="bg-white border border-line rounded-[10px] p-[18px] flex flex-col gap-3">
            <h3 className="m-0 text-sm font-semibold text-ink">Avance por actividad</h3>
            <GraficaAvancePorActividad actividades={indicadores.actividades} />
          </div>
        </div>
      )}
    </div>
  )
}
