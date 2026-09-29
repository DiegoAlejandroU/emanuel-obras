// Tokens visuales compartidos por las páginas rediseñadas.
// Solo presentación (etiquetas, colores de badges, formato de moneda) —
// ningún valor de aquí se envía al backend ni decide permisos.

export const ESTADO_OBRA = {
  planificada: { label: 'Planificación', bg: '#efefeb', fg: '#55564f', dot: '#9a9a92' },
  en_ejecucion: { label: 'En ejecución', bg: '#e7f2ea', fg: '#1f5f30', dot: '#2f7d3a' },
  suspendida: { label: 'Suspendida', bg: '#fdf1dc', fg: '#8a5300', dot: '#d99a1e' },
  terminada: { label: 'Terminada', bg: '#eceef1', fg: '#3b4250', dot: '#6b7385' },
  cancelada: { label: 'Cancelada', bg: '#fcebe9', fg: '#a1261b', dot: '#d14a3c' },
}

export const ESTADO_BITACORA = {
  borrador: { label: 'Borrador', bg: '#efefeb', fg: '#55564f', dot: '#9a9a92' },
  enviada: { label: 'Enviada', bg: '#fdf1dc', fg: '#8a5300', dot: '#d99a1e' },
  aprobada: { label: 'Aprobada', bg: '#e7f2ea', fg: '#1f5f30', dot: '#2f7d3a' },
  rechazada: { label: 'Rechazada', bg: '#fcebe9', fg: '#a1261b', dot: '#d14a3c' },
}

export const ETIQUETA_ROL = {
  administrador: 'Administrador',
  residente_obra: 'Residente de obra',
  interventor: 'Interventor',
  gerencia: 'Gerencia',
}

export function inicialesRol(rol) {
  const etiqueta = ETIQUETA_ROL[rol] || rol || '?'
  return etiqueta
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function fmtCOP(valor) {
  const n = Number(valor) || 0
  return '$ ' + n.toLocaleString('es-CO')
}

export function fmtFecha(fechaStr) {
  if (!fechaStr) return '—'
  const [anio, mes, dia] = fechaStr.split('-')
  if (!dia) return fechaStr
  return `${dia}/${mes}/${anio}`
}

// Estilo (para atributo `style`) de un botón dentro de un segmented-control
// tipo "pastilla": activo = fondo blanco con sombra sutil, inactivo = transparente.
export function estiloSegmento(activo) {
  return activo
    ? { background: '#fff', color: '#1c1d1a', boxShadow: '0 1px 2px rgba(28,29,26,.1)' }
    : { background: 'transparent', color: '#6b6c64', boxShadow: 'none' }
}

/** Badge tipo píldora con puntito de color — usa `style` en vez de clases de
 * Tailwind porque los colores por estado son dinámicos (vienen de un mapa). */
export function Badge({ estado, className = '' }) {
  if (!estado) return null
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-[22px] px-2 rounded-[5px] text-xs font-medium whitespace-nowrap ${className}`}
      style={{ background: estado.bg, color: estado.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: estado.dot }} />
      {estado.label}
    </span>
  )
}
