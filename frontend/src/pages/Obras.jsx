import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Badge, ESTADO_OBRA, estiloSegmento, fmtCOP, fmtFecha } from '../lib/estilos.jsx'

const ESTADOS_OBRA = ['planificada', 'en_ejecucion', 'suspendida', 'terminada', 'cancelada']

const OBRA_VACIA = {
  nombre: '',
  contratista: '',
  ubicacion: '',
  fecha_inicio: '',
  fecha_fin_estimada: '',
  presupuesto_total: 0,
}

const ACTIVIDAD_VACIA = {
  nombre: '',
  descripcion: '',
  pesoPorcentualUi: 0, // 0-100 en la interfaz; se convierte a fracción 0-1 al guardar
  costo_presupuestado: 0,
  fecha_inicio_programada: '',
  fecha_fin_programada: '',
}

const FILTROS_ESTADO = [['todas', 'Todas'], ...ESTADOS_OBRA.map((e) => [e, ESTADO_OBRA[e].label])]
const VISTAS = [
  ['tabla', 'Tabla'],
  ['tarjetas', 'Tarjetas'],
]

export default function Obras({ puedeEditar, onObrasCambian }) {
  const [obras, setObras] = useState([])
  const [obraSeleccionada, setObraSeleccionada] = useState(null)
  const [actividades, setActividades] = useState([])

  const [formObra, setFormObra] = useState(OBRA_VACIA)
  const [editandoObraId, setEditandoObraId] = useState(null)
  const [drawerAbierto, setDrawerAbierto] = useState(false)

  const [formActividad, setFormActividad] = useState(ACTIVIDAD_VACIA)
  const [editandoActividadId, setEditandoActividadId] = useState(null)

  const [mensaje, setMensaje] = useState(null)
  const [confirmacion, setConfirmacion] = useState(null)

  const [q, setQ] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [vista, setVista] = useState('tabla')

  function cargarObras() {
    api
      .listarObras()
      .then((data) => {
        setObras(data)
        onObrasCambian?.(data)
        if (obraSeleccionada) {
          const actualizada = data.find((o) => o.id === obraSeleccionada.id)
          setObraSeleccionada(actualizada || null)
        }
      })
      .catch((err) => setMensaje(err.message))
  }

  useEffect(() => {
    cargarObras()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cargarActividades(obraId) {
    api.listarActividades(obraId).then(setActividades).catch((err) => setMensaje(err.message))
  }

  useEffect(() => {
    if (obraSeleccionada) {
      cargarActividades(obraSeleccionada.id)
    } else {
      setActividades([])
    }
    setFormActividad(ACTIVIDAD_VACIA)
    setEditandoActividadId(null)
  }, [obraSeleccionada?.id])

  function abrirDrawerNueva() {
    setEditandoObraId(null)
    setFormObra(OBRA_VACIA)
    setDrawerAbierto(true)
  }

  function abrirDrawerEditar(obra) {
    editarObra(obra)
    setDrawerAbierto(true)
  }

  function cerrarDrawer() {
    setDrawerAbierto(false)
    setEditandoObraId(null)
    setFormObra(OBRA_VACIA)
  }

  async function guardarObra(e) {
    e.preventDefault()
    try {
      const payload = {
        ...formObra,
        presupuesto_total: Number(formObra.presupuesto_total) || 0,
        fecha_inicio: formObra.fecha_inicio || null,
        fecha_fin_estimada: formObra.fecha_fin_estimada || null,
      }
      if (editandoObraId) {
        await api.actualizarObra(editandoObraId, payload)
        setMensaje('Obra actualizada.')
      } else {
        await api.crearObra(payload)
        setMensaje('Obra creada.')
      }
      setFormObra(OBRA_VACIA)
      setEditandoObraId(null)
      setDrawerAbierto(false)
      cargarObras()
    } catch (err) {
      setMensaje(`Error al guardar la obra: ${err.message}`)
    }
  }

  function editarObra(obra) {
    setEditandoObraId(obra.id)
    setFormObra({
      nombre: obra.nombre,
      contratista: obra.contratista || '',
      ubicacion: obra.ubicacion || '',
      fecha_inicio: obra.fecha_inicio || '',
      fecha_fin_estimada: obra.fecha_fin_estimada || '',
      presupuesto_total: obra.presupuesto_total || 0,
    })
  }

  async function cambiarEstado(obra, estado) {
    try {
      await api.cambiarEstadoObra(obra.id, estado)
      cargarObras()
    } catch (err) {
      setMensaje(`Error al cambiar el estado: ${err.message}`)
    }
  }

  function eliminarObra(obra) {
    setConfirmacion({
      titulo: 'Eliminar obra',
      mensaje: `¿Eliminar la obra "${obra.nombre}"? Esta acción no se puede deshacer.`,
      onConfirmar: () => ejecutarEliminarObra(obra),
    })
  }

  async function ejecutarEliminarObra(obra) {
    setConfirmacion(null)
    try {
      await api.eliminarObra(obra.id)
      if (obraSeleccionada?.id === obra.id) setObraSeleccionada(null)
      cargarObras()
    } catch (err) {
      setMensaje(`Error al eliminar la obra: ${err.message}`)
    }
  }

  async function guardarActividad(e) {
    e.preventDefault()
    if (!obraSeleccionada) return
    try {
      const payload = {
        nombre: formActividad.nombre,
        descripcion: formActividad.descripcion || null,
        peso_porcentual: (Number(formActividad.pesoPorcentualUi) || 0) / 100,
        costo_presupuestado: Number(formActividad.costo_presupuestado) || 0,
        fecha_inicio_programada: formActividad.fecha_inicio_programada || null,
        fecha_fin_programada: formActividad.fecha_fin_programada || null,
      }
      if (editandoActividadId) {
        await api.actualizarActividad(editandoActividadId, payload)
      } else {
        await api.crearActividad(obraSeleccionada.id, payload)
      }
      setFormActividad(ACTIVIDAD_VACIA)
      setEditandoActividadId(null)
      cargarActividades(obraSeleccionada.id)
    } catch (err) {
      setMensaje(`Error al guardar la actividad: ${err.message}`)
    }
  }

  function editarActividad(actividad) {
    setEditandoActividadId(actividad.id)
    setFormActividad({
      nombre: actividad.nombre,
      descripcion: actividad.descripcion || '',
      pesoPorcentualUi: Math.round((actividad.peso_porcentual || 0) * 100),
      costo_presupuestado: actividad.costo_presupuestado,
      fecha_inicio_programada: actividad.fecha_inicio_programada || '',
      fecha_fin_programada: actividad.fecha_fin_programada || '',
    })
  }

  function cancelarEdicionActividad() {
    setEditandoActividadId(null)
    setFormActividad(ACTIVIDAD_VACIA)
  }

  function eliminarActividad(actividad) {
    setConfirmacion({
      titulo: 'Eliminar actividad',
      mensaje: `¿Eliminar la actividad "${actividad.nombre}"? Esta acción no se puede deshacer.`,
      onConfirmar: () => ejecutarEliminarActividad(actividad),
    })
  }

  async function ejecutarEliminarActividad(actividad) {
    setConfirmacion(null)
    try {
      await api.eliminarActividad(actividad.id)
      cargarActividades(obraSeleccionada.id)
    } catch (err) {
      setMensaje(`Error al eliminar la actividad: ${err.message}`)
    }
  }

  const sumaPesos = actividades.reduce((acc, a) => acc + (a.peso_porcentual || 0) * 100, 0)

  const ql = q.trim().toLowerCase()
  const obrasFiltradas = obras
    .filter((o) => filtroEstado === 'todas' || o.estado === filtroEstado)
    .filter((o) => !ql || `${o.nombre} ${o.ubicacion} ${o.contratista}`.toLowerCase().includes(ql))

  return (
    <div className="p-7 flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <h1 className="m-0 text-[22px] font-semibold tracking-tight">Obras</h1>
          <span className="text-muted">
            {obras.length} obra{obras.length === 1 ? '' : 's'} registrada{obras.length === 1 ? '' : 's'}
          </span>
        </div>
        {puedeEditar && (
          <button
            onClick={abrirDrawerNueva}
            className="h-[34px] px-3.5 rounded-[7px] border border-brand-dark bg-brand text-white font-medium cursor-pointer hover:bg-brand-dark flex items-center gap-1.5 text-sm"
          >
            <span className="text-base leading-none">+</span> Nueva obra
          </button>
        )}
      </div>

      {mensaje && <p className="text-sm text-muted m-0">{mensaje}</p>}

      <div className="flex items-center gap-2.5 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, ubicación o contratista"
          className="h-8 w-80 max-w-full border border-line-input rounded-[7px] px-2.5 bg-white outline-none focus:border-brand focus:shadow-focus text-sm"
        />
        <div className="flex gap-0.5 p-0.5 bg-[#ecebe6] rounded-lg flex-wrap">
          {FILTROS_ESTADO.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFiltroEstado(k)}
              style={estiloSegmento(filtroEstado === k)}
              className="h-7 px-2.5 border-none rounded-md cursor-pointer text-xs font-medium"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-0.5 p-0.5 bg-[#ecebe6] rounded-lg">
          {VISTAS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setVista(k)}
              style={estiloSegmento(vista === k)}
              className="h-7 px-2.5 border-none rounded-md cursor-pointer text-xs font-medium"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {vista === 'tabla' ? (
        <div className="bg-white border border-line rounded-[10px] overflow-x-auto">
          <div className="min-w-[860px]">
            <div
              className="grid gap-4 px-4 py-2.5 border-b border-line text-[11.5px] font-medium text-muted-2 uppercase tracking-wide"
              style={{ gridTemplateColumns: 'minmax(220px,2.1fr) minmax(120px,1fr) minmax(150px,1.3fr) 130px 180px 220px' }}
            >
              <span>Obra</span>
              <span>Ubicación</span>
              <span>Contratista</span>
              <span className="text-right">Presupuesto</span>
              <span>Plazo</span>
              <span>Estado</span>
            </div>
            {obrasFiltradas.map((o) => (
              <div
                key={o.id}
                onClick={() => setObraSeleccionada(o)}
                className={`grid gap-4 px-4 py-3 border-b border-line-soft items-center cursor-pointer hover:bg-[#fafaf7] last:border-b-0 ${
                  obraSeleccionada?.id === o.id ? 'bg-brand-soft/40' : ''
                }`}
                style={{ gridTemplateColumns: 'minmax(220px,2.1fr) minmax(120px,1fr) minmax(150px,1.3fr) 130px 180px 220px' }}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-medium truncate text-sm">{o.nombre}</span>
                  <span className="font-mono text-[11.5px] text-muted-3">#{o.id}</span>
                </div>
                <span className="text-muted-4 text-sm truncate">{o.ubicacion || '—'}</span>
                <span className="text-muted-4 text-sm truncate">{o.contratista || '—'}</span>
                <span className="text-right font-mono text-[12.5px]">{fmtCOP(o.presupuesto_total)}</span>
                <span className="text-muted-2 text-xs font-mono">
                  {fmtFecha(o.fecha_inicio)} → {fmtFecha(o.fecha_fin_estimada)}
                </span>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {puedeEditar ? (
                    <select
                      className="text-xs border border-line-input rounded-md px-1.5 py-1 bg-white outline-none"
                      value={o.estado}
                      onChange={(e) => cambiarEstado(o, e.target.value)}
                    >
                      {ESTADOS_OBRA.map((estado) => (
                        <option key={estado} value={estado}>
                          {ESTADO_OBRA[estado].label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge estado={ESTADO_OBRA[o.estado]} />
                  )}
                  {puedeEditar && (
                    <>
                      <button
                        className="text-xs text-brand hover:underline"
                        onClick={() => abrirDrawerEditar(o)}
                      >
                        Editar
                      </button>
                      <button
                        className="text-xs text-status-rejected-fg hover:underline"
                        onClick={() => eliminarObra(o)}
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {obrasFiltradas.length === 0 && (
              <div className="p-10 text-center text-muted-3">
                {obras.length === 0 ? 'Todavía no hay obras registradas.' : 'Ninguna obra coincide con el filtro.'}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
          {obrasFiltradas.map((o) => (
            <div
              key={o.id}
              onClick={() => setObraSeleccionada(o)}
              className={`bg-white border rounded-[10px] p-[18px] flex flex-col gap-3.5 cursor-pointer hover:shadow-card ${
                obraSeleccionada?.id === o.id ? 'border-brand' : 'border-line'
              }`}
            >
              <div className="flex justify-between items-start gap-2.5">
                <span className="font-mono text-[11.5px] text-muted-3">#{o.id}</span>
                <Badge estado={ESTADO_OBRA[o.estado]} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-[15px] tracking-tight text-balance">{o.nombre}</span>
                <span className="text-muted text-sm">
                  {o.ubicacion || '—'} · {o.contratista || '—'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-line-soft">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11.5px] text-muted-3">Presupuesto</span>
                  <span className="font-mono text-finance-dark font-medium text-sm">{fmtCOP(o.presupuesto_total)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11.5px] text-muted-3">Plazo</span>
                  <span className="font-mono text-xs">
                    {fmtFecha(o.fecha_inicio)} → {fmtFecha(o.fecha_fin_estimada)}
                  </span>
                </div>
              </div>
              {puedeEditar && (
                <div className="flex gap-3 pt-1" onClick={(e) => e.stopPropagation()}>
                  <button className="text-xs text-brand hover:underline" onClick={() => abrirDrawerEditar(o)}>
                    Editar
                  </button>
                  <button className="text-xs text-status-rejected-fg hover:underline" onClick={() => eliminarObra(o)}>
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
          {obrasFiltradas.length === 0 && (
            <div className="col-span-full p-10 text-center text-muted-3 bg-white border border-line rounded-[10px]">
              {obras.length === 0 ? 'Todavía no hay obras registradas.' : 'Ninguna obra coincide con el filtro.'}
            </div>
          )}
        </div>
      )}

      {obraSeleccionada && (
        <div className="bg-white border border-line rounded-[10px] flex flex-col">
          <div className="px-[18px] py-3.5 border-b border-line-soft flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <h3 className="m-0 text-base font-semibold">Actividades de "{obraSeleccionada.nombre}"</h3>
              <span className={`text-xs font-medium ${sumaPesos === 100 ? 'text-status-approved-fg' : 'text-status-sent-fg'}`}>
                suma de pesos: {Math.round(sumaPesos)}%{sumaPesos !== 100 ? ' — debería sumar 100%' : ''}
              </span>
            </div>
            <button className="text-xs text-muted-3 hover:text-ink" onClick={() => setObraSeleccionada(null)}>
              Cerrar ✕
            </button>
          </div>

          <div className="p-[18px] flex flex-col gap-4">
            {puedeEditar && (
              <form onSubmit={guardarActividad} className="grid grid-cols-2 lg:grid-cols-4 gap-3 border border-line-soft rounded-[8px] p-3.5 bg-[#fbfbf9]">
                <label className="text-xs text-muted-3 flex flex-col gap-1 col-span-2">
                  Nombre de la actividad
                  <input
                    className="border border-line-input rounded-[7px] px-2.5 py-1.5 outline-none focus:border-brand text-sm"
                    placeholder="Ej: Excavación de cimientos"
                    value={formActividad.nombre}
                    onChange={(e) => setFormActividad({ ...formActividad, nombre: e.target.value })}
                    required
                  />
                </label>
                <label className="text-xs text-muted-3 flex flex-col gap-1">
                  Peso %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="border border-line-input rounded-[7px] px-2.5 py-1.5 outline-none font-mono text-sm"
                    value={formActividad.pesoPorcentualUi}
                    onChange={(e) => setFormActividad({ ...formActividad, pesoPorcentualUi: e.target.value })}
                  />
                </label>
                <label className="text-xs text-muted-3 flex flex-col gap-1">
                  Costo presupuestado
                  <input
                    type="number"
                    min="0"
                    className="border border-line-input rounded-[7px] px-2.5 py-1.5 outline-none font-mono text-sm"
                    value={formActividad.costo_presupuestado}
                    onChange={(e) => setFormActividad({ ...formActividad, costo_presupuestado: e.target.value })}
                  />
                </label>
                <label className="text-xs text-muted-3 flex flex-col gap-1">
                  Inicio programado
                  <input
                    type="date"
                    className="border border-line-input rounded-[7px] px-2.5 py-1.5 outline-none text-sm"
                    value={formActividad.fecha_inicio_programada}
                    onChange={(e) => setFormActividad({ ...formActividad, fecha_inicio_programada: e.target.value })}
                  />
                </label>
                <label className="text-xs text-muted-3 flex flex-col gap-1">
                  Fin programado
                  <input
                    type="date"
                    className="border border-line-input rounded-[7px] px-2.5 py-1.5 outline-none text-sm"
                    value={formActividad.fecha_fin_programada}
                    onChange={(e) => setFormActividad({ ...formActividad, fecha_fin_programada: e.target.value })}
                  />
                </label>
                <div className="col-span-2 lg:col-span-4 flex gap-2">
                  <button type="submit" className="bg-brand text-white px-3.5 py-1.5 rounded-[7px] hover:bg-brand-dark text-sm font-medium">
                    {editandoActividadId ? 'Guardar cambios' : 'Agregar actividad'}
                  </button>
                  {editandoActividadId && (
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-[7px] text-muted-2 hover:text-ink text-sm"
                      onClick={cancelarEdicionActividad}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            )}

            <div className="flex flex-col">
              {actividades.map((a, i) => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between gap-3 py-2.5 ${i > 0 ? 'border-t border-line-softer' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="m-0 font-medium text-sm truncate">{a.nombre}</p>
                    <p className="m-0 text-xs text-muted-2">
                      Peso: <span className="font-mono">{Math.round((a.peso_porcentual || 0) * 100)}%</span> · Presupuestado:{' '}
                      <span className="font-mono">{fmtCOP(a.costo_presupuestado)}</span> · Estado: {a.estado}
                    </p>
                  </div>
                  {puedeEditar && (
                    <div className="flex gap-3 flex-none">
                      <button className="text-xs text-brand hover:underline" onClick={() => editarActividad(a)}>
                        Editar
                      </button>
                      <button className="text-xs text-status-rejected-fg hover:underline" onClick={() => eliminarActividad(a)}>
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {actividades.length === 0 && (
                <p className="text-sm text-muted-3 py-2">Esta obra no tiene actividades todavía.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {drawerAbierto && (
        <>
          <div className="fixed inset-0 bg-ink/30 z-20" onClick={cerrarDrawer} />
          <form
            onSubmit={guardarObra}
            className="fixed top-0 right-0 bottom-0 w-[480px] max-w-full bg-white z-30 flex flex-col shadow-drawer"
          >
            <div className="px-[22px] py-[18px] border-b border-line flex justify-between items-center">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-base">{editandoObraId ? 'Editar obra' : 'Nueva obra'}</span>
                {!editandoObraId && <span className="text-[12.5px] text-muted-2">El código lo asigna el servidor al crearla</span>}
              </div>
              <button
                type="button"
                onClick={cerrarDrawer}
                className="w-[30px] h-[30px] border-none bg-transparent rounded-md cursor-pointer text-muted-2 text-base hover:bg-line-soft"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto px-[22px] py-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-medium text-muted-4">Nombre de la obra</span>
                <input
                  className="h-9 border border-line-input rounded-[7px] px-2.5 outline-none focus:border-brand focus:shadow-focus"
                  value={formObra.nombre}
                  onChange={(e) => setFormObra({ ...formObra, nombre: e.target.value })}
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-medium text-muted-4">Ubicación</span>
                <input
                  className="h-9 border border-line-input rounded-[7px] px-2.5 outline-none focus:border-brand"
                  value={formObra.ubicacion}
                  onChange={(e) => setFormObra({ ...formObra, ubicacion: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-medium text-muted-4">Contratista</span>
                <input
                  className="h-9 border border-line-input rounded-[7px] px-2.5 outline-none focus:border-brand"
                  value={formObra.contratista}
                  onChange={(e) => setFormObra({ ...formObra, contratista: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-medium text-muted-4">Presupuesto total (COP)</span>
                <input
                  type="number"
                  min="0"
                  className="h-9 border border-line-input rounded-[7px] px-2.5 outline-none focus:border-brand font-mono"
                  value={formObra.presupuesto_total}
                  onChange={(e) => setFormObra({ ...formObra, presupuesto_total: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-medium text-muted-4">Fecha de inicio</span>
                  <input
                    type="date"
                    className="h-9 border border-line-input rounded-[7px] px-2.5 outline-none focus:border-brand"
                    value={formObra.fecha_inicio}
                    onChange={(e) => setFormObra({ ...formObra, fecha_inicio: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-medium text-muted-4">Fecha fin estimada</span>
                  <input
                    type="date"
                    className="h-9 border border-line-input rounded-[7px] px-2.5 outline-none focus:border-brand"
                    value={formObra.fecha_fin_estimada}
                    onChange={(e) => setFormObra({ ...formObra, fecha_fin_estimada: e.target.value })}
                  />
                </label>
              </div>
            </div>
            <div className="px-[22px] py-3.5 border-t border-line flex justify-end gap-2">
              <button
                type="button"
                onClick={cerrarDrawer}
                className="h-[34px] px-3.5 rounded-[7px] border border-line-input bg-white font-medium cursor-pointer hover:bg-[#f6f5f1] text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-[34px] px-4 rounded-[7px] border border-brand-dark bg-brand text-white font-medium cursor-pointer hover:bg-brand-dark text-sm"
              >
                {editandoObraId ? 'Guardar cambios' : 'Crear obra'}
              </button>
            </div>
          </form>
        </>
      )}

      <ConfirmDialog
        abierto={!!confirmacion}
        titulo={confirmacion?.titulo}
        mensaje={confirmacion?.mensaje}
        onConfirmar={confirmacion?.onConfirmar}
        onCancelar={() => setConfirmacion(null)}
      />
    </div>
  )
}
