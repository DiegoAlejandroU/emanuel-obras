import { useState } from 'react'
import { fmtFecha } from '../lib/estilos.jsx'

const ESTADOS = [
  ['abierto', 'Abierto'],
  ['en_gestion', 'En gestión'],
  ['cerrado', 'Cerrado'],
]

const COLOR_GRAVEDAD = {
  alta: 'bg-status-rejected-bg text-status-rejected-fg',
  media: 'bg-status-sent-bg text-status-sent-fg',
  baja: 'bg-status-draft-bg text-status-draft-fg',
}

function FilaIncidente({ incidente, puedeGestionar, onActualizar }) {
  const [responsable, setResponsable] = useState(incidente.responsable || '')
  const [guardando, setGuardando] = useState(false)
  const cerrado = incidente.estado === 'cerrado'

  async function guardar(cambios) {
    setGuardando(true)
    try {
      await onActualizar(incidente, cambios)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={`flex flex-col gap-2 px-[18px] py-3 border-b border-line-softer last:border-b-0 ${cerrado ? 'opacity-60' : ''}`}>
      <div className="flex gap-2.5 items-start">
        <span className={`flex-none h-5 px-1.5 rounded text-[11.5px] font-medium inline-flex items-center capitalize ${COLOR_GRAVEDAD[incidente.gravedad] || COLOR_GRAVEDAD.baja}`}>
          {incidente.gravedad}
        </span>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-sm leading-snug">{incidente.descripcion}</span>
          <span className="text-xs text-muted-2">
            {incidente.tipo} · reportado el {fmtFecha(incidente.fecha_reporte)}
            {incidente.vencido && <span className="ml-1.5 font-semibold text-status-rejected-fg">· VENCIDO</span>}
          </span>
        </div>
      </div>

      {puedeGestionar ? (
        <div className="flex flex-wrap gap-2 pl-0 sm:pl-[34px]">
          <select
            aria-label="Estado del incidente"
            className="h-8 border border-line-input rounded-[7px] px-2 bg-white text-xs outline-none disabled:opacity-50"
            value={incidente.estado}
            disabled={guardando}
            onChange={(e) => guardar({ estado: e.target.value })}
          >
            {ESTADOS.map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
          <input
            aria-label="Responsable"
            className="h-8 border border-line-input rounded-[7px] px-2 text-xs outline-none focus:border-brand w-[150px]"
            placeholder="Responsable"
            value={responsable}
            maxLength={200}
            onChange={(e) => setResponsable(e.target.value)}
            onBlur={() => {
              if (responsable.trim() !== (incidente.responsable || '')) guardar({ responsable: responsable.trim() || null })
            }}
          />
          <input
            aria-label="Fecha límite"
            type="date"
            className="h-8 border border-line-input rounded-[7px] px-2 text-xs outline-none focus:border-brand"
            value={incidente.fecha_limite || ''}
            onChange={(e) => guardar({ fecha_limite: e.target.value || null })}
          />
        </div>
      ) : (
        <span className="text-xs text-muted-2 sm:pl-[34px]">
          {ESTADOS.find(([v]) => v === incidente.estado)?.[1]} · Responsable: {incidente.responsable || '—'} · Límite:{' '}
          {fmtFecha(incidente.fecha_limite)}
        </span>
      )}
    </div>
  )
}

/**
 * Incidentes reportados en bitácoras ya enviadas o aprobadas, tratados como
 * tareas: estado, responsable y fecha límite. Solo administrador, residente e
 * interventor pueden modificarlos (el backend lo vuelve a validar).
 */
export default function PanelIncidentes({ incidentes, puedeGestionar, onActualizar }) {
  const [verCerrados, setVerCerrados] = useState(false)
  const abiertos = incidentes.filter((i) => i.estado !== 'cerrado')
  const cerrados = incidentes.filter((i) => i.estado === 'cerrado')
  const visibles = verCerrados ? incidentes : abiertos
  const vencidos = abiertos.filter((i) => i.vencido).length

  return (
    <div className="bg-white border border-line rounded-[10px] flex flex-col">
      <div className="px-[18px] py-3.5 border-b border-line-soft flex flex-wrap justify-between items-center gap-2">
        <span className="font-semibold text-sm">Seguimiento de incidentes</span>
        <span className="text-xs text-muted-2">
          {abiertos.length} abierto(s){vencidos > 0 && <span className="text-status-rejected-fg font-semibold"> · {vencidos} vencido(s)</span>}
          {cerrados.length > 0 && (
            <button className="ml-3 text-brand hover:underline" onClick={() => setVerCerrados((v) => !v)}>
              {verCerrados ? 'Ocultar cerrados' : `Ver cerrados (${cerrados.length})`}
            </button>
          )}
        </span>
      </div>
      <div className="flex flex-col max-h-[420px] overflow-auto">
        {visibles.map((inc) => (
          <FilaIncidente key={inc.id} incidente={inc} puedeGestionar={puedeGestionar} onActualizar={onActualizar} />
        ))}
        {visibles.length === 0 && (
          <p className="text-sm text-muted-3 px-[18px] py-4 m-0">
            {incidentes.length === 0
              ? 'Aún no hay incidentes en bitácoras enviadas o aprobadas.'
              : 'No hay incidentes abiertos.'}
          </p>
        )}
      </div>
    </div>
  )
}
