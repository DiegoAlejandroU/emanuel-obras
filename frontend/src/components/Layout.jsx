import { useState } from 'react'
import { inicialesRol, ETIQUETA_ROL } from '../lib/estilos.jsx'

const ICONOS = {
  obras: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2" y="2.5" width="12" height="11" rx="1.5"></rect>
      <path d="M2 6h12M6 6v7.5"></path>
    </svg>
  ),
  bitacora: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 1.5h6l3 3v10H4z"></path>
      <path d="M6.5 7.5h4M6.5 10h4"></path>
    </svg>
  ),
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2 13.5h12M4 11V8M7.3 11V4.5M10.6 11V6.5"></path>
    </svg>
  ),
  usuarios: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="6" cy="5.5" r="2.5"></circle>
      <path d="M1.5 13.5c.5-2.5 2.3-4 4.5-4s4 1.5 4.5 4M11 3.5a2.2 2.2 0 010 4.2M12.5 9.8c1 .6 1.7 2 2 3.7"></path>
    </svg>
  ),
}

const CRUMB_RAIZ = {
  obras: 'Obras',
  bitacora: 'Bitácora',
  dashboard: 'Dashboard',
  usuarios: 'Administración',
}

const FECHA_HOY = new Date().toLocaleDateString('es-CO', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/**
 * Cascarón visual de la app ya autenticada: sidebar fijo (marca, selector de
 * obra activa, navegación, usuario) + header superior con breadcrumb.
 * No contiene lógica de negocio: solo recibe props y renderiza.
 */
export default function Layout({
  usuario,
  tabs,
  tabActivo,
  onTabChange,
  obras,
  obraActivaId,
  onObraActivaChange,
  mostrarSelectorObra,
  crumbLeaf,
  onCerrarSesion,
  children,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="h-screen md:grid md:grid-cols-[248px_minmax(0,1fr)] bg-paper text-ink font-sans">
      {menuAbierto && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMenuAbierto(false)} />
      )}
      <aside
        className={`bg-sidebar border-r border-line-strong flex flex-col min-h-0 fixed inset-y-0 left-0 z-40 w-[248px] transition-transform duration-200 md:static md:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 pt-4 pb-3.5 flex items-center gap-2.5 border-b border-line-strong">
          <div className="w-[30px] h-[30px] rounded-[7px] bg-brand-darker text-brand-soft flex items-center justify-center font-bold text-xs flex-none">
            EI
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-semibold text-[13.5px] truncate">Emanuel</span>
            <span className="text-[11.5px] text-muted-2 truncate">Ingeniería y Construcciones</span>
          </div>
        </div>

        {mostrarSelectorObra && (
          <div className="px-3 pt-3.5 pb-1.5 flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-3 uppercase tracking-wide px-1">Obra activa</span>
            <select
              className="h-[34px] border border-line-input rounded-[7px] px-2 bg-white font-medium outline-none w-full text-sm"
              value={obraActivaId ?? ''}
              onChange={(e) => onObraActivaChange(e.target.value || null)}
            >
              <option value="">Selecciona una obra…</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="px-3 py-2.5 flex flex-col gap-0.5">
          <span className="text-[11px] font-medium text-muted-3 uppercase tracking-wide px-1 py-1.5">Trabajo</span>
          {tabs.map((t) => {
            const activo = tabActivo === t.key
            return (
              <button
                key={t.key}
                onClick={() => {
                  onTabChange(t.key)
                  setMenuAbierto(false)
                }}
                className={`flex items-center gap-2.5 h-8 px-2.5 rounded-md text-left cursor-pointer ${
                  activo ? 'bg-white shadow-pill font-medium' : 'text-[#4a4b45] hover:bg-[#e7e6e0] font-normal'
                }`}
              >
                {ICONOS[t.key]}
                <span className="flex-1">{t.label}</span>
                {t.key === 'obras' && typeof t.count === 'number' && (
                  <span className="font-mono text-[11.5px] text-muted-3">{t.count}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto p-3 border-t border-line-strong flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-[30px] h-[30px] rounded-full bg-brand-tint text-brand-text flex items-center justify-center text-[11.5px] font-semibold flex-none">
              {inicialesRol(usuario.rol)}
            </div>
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <span className="font-medium truncate text-sm">{ETIQUETA_ROL[usuario.rol] || usuario.rol}</span>
              <span className="text-xs text-muted-2 truncate">Usuario #{usuario.id}</span>
            </div>
            <button
              onClick={onCerrarSesion}
              title="Cerrar sesión"
              className="w-7 h-7 border-none bg-transparent rounded-md text-muted-2 cursor-pointer flex items-center justify-center hover:bg-[#e7e6e0]"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M6 2.5H3v11h3M10 5l3 3-3 3M13 8H6"></path>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 overflow-auto flex flex-col">
        <header className="h-[52px] flex-none border-b border-line bg-white flex items-center justify-between px-4 md:px-7 sticky top-0 z-[5] gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              className="md:hidden w-8 h-8 flex-none flex items-center justify-center rounded-md text-muted-2 hover:bg-[#e7e6e0]"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M2 4h12M2 8h12M2 12h12"></path>
              </svg>
            </button>
            <div className="flex items-center gap-2 text-muted-2 min-w-0 text-sm">
              <span className="hidden sm:inline">{CRUMB_RAIZ[tabActivo]}</span>
              <span className="hidden sm:inline text-[#c4c3bb]">/</span>
              <span className="text-ink font-medium whitespace-nowrap overflow-hidden text-ellipsis">{crumbLeaf}</span>
            </div>
          </div>
          <div className="flex items-center gap-3.5 text-muted-2 text-[12.5px]">
            <span className="font-mono whitespace-nowrap capitalize hidden sm:inline">{FECHA_HOY}</span>
            <span className="flex items-center gap-1.5 px-2 py-[3px] border border-line-strong rounded-full text-muted-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
              {ETIQUETA_ROL[usuario.rol] || usuario.rol}
            </span>
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}
