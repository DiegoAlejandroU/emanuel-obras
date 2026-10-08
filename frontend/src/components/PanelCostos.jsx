import { fmtCOP } from '../lib/estilos.jsx'

/**
 * Control de costos de la obra: gasto real (lo registra administración en
 * cada actividad) contra el valor del avance aprobado ("valor ganado" =
 * costo presupuestado × avance aprobado). Si el gasto real supera ese valor,
 * la obra está gastando más de lo que ha avanzado.
 */
export default function PanelCostos({ indicadores }) {
  const sinCostos = !indicadores.costo_real_total
  const desviacion = indicadores.desviacion_costo || 0
  const sobrecosto = !sinCostos && desviacion < 0
  const colorDesviacion = sinCostos ? 'text-muted' : sobrecosto ? 'text-status-rejected-fg' : 'text-brand-text'
  const indice = indicadores.indice_costo

  return (
    <div className="bg-white border border-line rounded-[10px] flex flex-col">
      <div className="px-[18px] py-3.5 border-b border-line-soft flex flex-wrap justify-between items-center gap-2">
        <span className="font-semibold text-sm">Control de costos</span>
        {indice !== null && indice !== undefined && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-[5px] ${
              indice < 0.9 ? 'bg-status-rejected-bg text-status-rejected-fg' : 'bg-status-approved-bg text-status-approved-fg'
            }`}
            title="Índice de costo: valor del avance aprobado ÷ costo real. Menor a 1 = se está gastando más de lo avanzado."
          >
            Índice de costo {indice.toFixed(2)}
          </span>
        )}
      </div>

      <div className="p-[18px] flex flex-col gap-4">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
          <div className="flex flex-col gap-1">
            <span className="text-[12.5px] text-muted font-medium">Costo real registrado</span>
            <span className="text-[22px] font-semibold tracking-tight font-mono">{fmtCOP(indicadores.costo_real_total)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[12.5px] text-muted font-medium">Valor del avance aprobado</span>
            <span className="text-[22px] font-semibold tracking-tight font-mono">{fmtCOP(indicadores.valor_ganado_total)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[12.5px] text-muted font-medium">{sobrecosto ? 'Sobrecosto' : 'Diferencia a favor'}</span>
            <span className={`text-[22px] font-semibold tracking-tight font-mono ${colorDesviacion}`}>
              {sinCostos ? '—' : fmtCOP(Math.abs(desviacion))}
            </span>
          </div>
        </div>

        {sinCostos ? (
          <p className="m-0 text-sm text-muted-3">
            Todavía no hay costos reales registrados. Administración los ingresa en cada actividad (pestaña Obras → Costo real).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-left text-xs text-muted-3 border-b border-line-soft">
                  <th className="py-2 pr-3 font-medium">Actividad</th>
                  <th className="py-2 pr-3 font-medium text-right">Presupuestado</th>
                  <th className="py-2 pr-3 font-medium text-right">Valor del avance</th>
                  <th className="py-2 font-medium text-right">Costo real</th>
                </tr>
              </thead>
              <tbody>
                {indicadores.actividades.map((a) => {
                  const pasado = a.costo_real > a.valor_ganado * 1.1 && a.costo_real > 0
                  return (
                    <tr key={a.actividad_id} className="border-b border-line-softer last:border-b-0">
                      <td className="py-2 pr-3">{a.nombre}</td>
                      <td className="py-2 pr-3 text-right font-mono text-muted-2">{fmtCOP(a.costo_presupuestado)}</td>
                      <td className="py-2 pr-3 text-right font-mono text-muted-2">{fmtCOP(a.valor_ganado)}</td>
                      <td className={`py-2 text-right font-mono ${pasado ? 'text-status-rejected-fg font-semibold' : ''}`}>
                        {fmtCOP(a.costo_real)}
                        {pasado && <span className="ml-1.5 text-[11px]">▲ sobre lo avanzado</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
