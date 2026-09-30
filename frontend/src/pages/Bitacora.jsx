import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { usuarioActualDesdeToken } from '../lib/auth.js'
import { Badge, ESTADO_BITACORA } from '../lib/estilos.jsx'

const FORM_VACIO = { clima: '', personal_en_obra: 0, resumen: '' }

/**
 * `obras`, `obraId` y `onObraIdChange` son opcionales: si no se reciben, el
 * componente vuelve a cargar la lista de obras y maneja su propia selección
 * (mismo comportamiento que antes del rediseño, cuando esta página no vivía
 * dentro del Layout con selector de "obra activa" en el sidebar).
 */
export default function Bitacora({ obras: obrasProp, obraId: obraIdProp, onObraIdChange }) {
  const usuario = usuarioActualDesdeToken()
  const puedeCrear = usuario && ['administrador', 'residente_obra'].includes(usuario.rol)
  const puedeAprobar = usuario && usuario.rol === 'interventor'

  const [obrasPropias, setObrasPropias] = useState([])
  const [obraIdPropio, setObraIdPropio] = useState(null)
  const [actividades, setActividades] = useState([])
  const [registros, setRegistros] = useState([])
  const [registroActivo, setRegistroActivo] = useState(null)

  const [form, setForm] = useState(FORM_VACIO)
  const [avancesPorActividad, setAvancesPorActividad] = useState({})
  const [personal, setPersonal] = useState([])
  const [materiales, setMateriales] = useState([])
  const [incidentes, setIncidentes] = useState([])

  const [mensaje, setMensaje] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const obras = obrasProp ?? obrasPropias
  const obraId = obraIdProp !== undefined ? obraIdProp : obraIdPropio
  const setObraId = onObraIdChange ?? setObraIdPropio
  const obraActual = obras.find((o) => String(o.id) === String(obraId))

  useEffect(() => {
    if (obrasProp) return
    api.listarObras().then(setObrasPropias).catch((err) => setMensaje(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cargarObra(id) {
    if (!id) {
      setActividades([])
      setRegistros([])
      return
    }
    api.listarActividades(id).then(setActividades).catch((err) => setMensaje(err.message))
    api.listarBitacoras(id).then((data) => {
      setRegistros(data)
      setRegistroActivo((actual) => (data.find((r) => r.id === actual) ? actual : data[0]?.id ?? null))
    }).catch((err) => setMensaje(err.message))
  }

  useEffect(() => {
    cargarObra(obraId)
    setAvancesPorActividad({})
    setPersonal([])
    setMateriales([])
    setIncidentes([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraId])

  function actualizarAvance(actividadId, campo, valor) {
    setAvancesPorActividad((prev) => ({ ...prev, [actividadId]: { ...prev[actividadId], [campo]: valor } }))
  }

  async function guardarRegistro(e) {
    e.preventDefault()
    if (!obraId || !usuario) return
    setGuardando(true)
    setMensaje(null)

    const registrosConFotos = Object.entries(avancesPorActividad)
      .map(([actividadId, valores]) => ({
        actividad_id: Number(actividadId),
        avance_del_dia: Number(valores.avance_del_dia) || 0,
        observaciones: valores.observaciones || null,
        archivos: valores.archivos || [],
      }))
      .filter((a) => a.avance_del_dia > 0 || a.observaciones || a.archivos.length > 0)

    // El backend recibe la bitácora como un solo JSON (sin archivos); las
    // fotos se suben aparte, una vez que cada registro de avance ya tiene id.
    const registros_avance = registrosConFotos.map(({ archivos, ...resto }) => resto)

    try {
      const bitacoraCreada = await api.crearBitacora(obraId, {
        responsable_id: usuario.id,
        ...form,
        registros_avance,
        registros_personal: personal,
        registros_material: materiales,
        incidentes,
      })

      const pendientesDeFoto = registrosConFotos.filter((r) => r.archivos.length > 0)
      const erroresFotos = []
      for (const pendiente of pendientesDeFoto) {
        const creado = bitacoraCreada.registros_avance.find((r) => r.actividad_id === pendiente.actividad_id)
        if (!creado) continue
        try {
          await api.subirFotosAvance(creado.id, pendiente.archivos)
        } catch (err) {
          erroresFotos.push(`${nombreActividad(pendiente.actividad_id)}: ${err.message}`)
        }
      }

      setMensaje(
        erroresFotos.length > 0
          ? `Registro guardado, pero no se pudieron subir algunas fotos: ${erroresFotos.join('; ')}`
          : 'Registro guardado en borrador. Recuerda enviarlo para que el interventor lo revise.'
      )
      setForm(FORM_VACIO)
      setAvancesPorActividad({})
      setPersonal([])
      setMateriales([])
      setIncidentes([])
      cargarObra(obraId)
    } catch (err) {
      setMensaje(`No se pudo guardar el registro: ${err.message}`)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarFotoDeAvance(fotoId) {
    try {
      await api.eliminarFotoAvance(fotoId)
      cargarObra(obraId)
    } catch (err) {
      setMensaje(`No se pudo eliminar la foto: ${err.message}`)
    }
  }

  async function cambiarEstado(registro, estado) {
    let motivo = null
    if (estado === 'rechazada') {
      motivo = window.prompt('Motivo del rechazo:')
      if (!motivo) return
    }
    try {
      await api.cambiarEstadoBitacora(registro.id, estado, motivo)
      cargarObra(obraId)
    } catch (err) {
      setMensaje(`No se pudo cambiar el estado: ${err.message}`)
    }
  }

  function nombreActividad(actividadId) {
    return actividades.find((a) => a.id === actividadId)?.nombre ?? `Actividad #${actividadId}`
  }

  function agregarFila(setter, plantilla) {
    setter((prev) => [...prev, plantilla])
  }

  function actualizarFila(setter, index, campo, valor) {
    setter((prev) => prev.map((fila, i) => (i === index ? { ...fila, [campo]: valor } : fila)))
  }

  function quitarFila(setter, index) {
    setter((prev) => prev.filter((_, i) => i !== index))
  }

  const registroSeleccionado = registros.find((r) => r.id === registroActivo)

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {!obrasProp && (
        <div className="px-7 pt-6">
          <select
            className="border border-line-input rounded-[7px] px-3 py-2 mb-2 bg-white outline-none text-sm"
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
        </div>
      )}

      {mensaje && <p className="text-sm text-muted px-7 m-0 mb-2">{mensaje}</p>}

      {!obraId ? (
        <div className="p-7">
          <div className="bg-white border border-dashed border-line-input rounded-[10px] p-10 text-center text-muted-3">
            Selecciona una obra {obrasProp ? 'en el sidebar' : 'arriba'} para ver su bitácora.
          </div>
        </div>
      ) : (
        <div className="grid flex-1 min-h-0 grid-cols-1 md:[grid-template-columns:clamp(220px,22vw,290px)_minmax(0,1fr)]">
          <div className="border-b md:border-b-0 md:border-r border-line bg-[#fbfbf9] flex flex-col overflow-auto max-h-[240px] md:max-h-none">
            <div className="px-4 pt-[18px] pb-3 flex flex-col gap-0.5">
              <span className="font-semibold text-[15px]">Bitácora diaria</span>
              <span className="text-muted-2 text-[12.5px] truncate">{obraActual?.nombre}</span>
            </div>
            <div className="flex flex-col px-2 pb-4 gap-0.5">
              {registros.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRegistroActivo(r.id)}
                  className={`flex flex-col gap-1.5 px-2.5 py-2.5 rounded-[7px] border cursor-pointer text-left hover:bg-[#f1f1ed] ${
                    r.id === registroActivo ? 'bg-white border-line-strong' : 'bg-transparent border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-medium whitespace-nowrap text-sm">{r.fecha}</span>
                    <Badge estado={ESTADO_BITACORA[r.estado]} />
                  </div>
                  <span className="text-xs text-muted-3 font-mono">
                    {r.personal_en_obra} personas · {r.clima || 'sin clima'}
                  </span>
                </button>
              ))}
              {registros.length === 0 && <p className="text-xs text-muted-3 px-2.5 py-2">Sin bitácoras todavía.</p>}
            </div>
          </div>

          <div className="min-w-0 flex flex-col overflow-auto">
            {puedeCrear && (
              <details className="border-b border-line bg-white open:bg-[#fbfbf9]">
                <summary className="px-7 py-3 cursor-pointer font-medium text-sm text-brand select-none">
                  + Registrar nueva bitácora
                </summary>
                <form onSubmit={guardarRegistro} className="px-7 pb-6 flex flex-col gap-4 max-w-[1180px]">
                  <section className="bg-white border border-line rounded-[10px]">
                    <div className="px-[18px] py-3.5 border-b border-line-soft flex items-baseline gap-2.5">
                      <span className="font-mono text-[11.5px] text-muted-3">01</span>
                      <span className="font-semibold text-sm">Condiciones de la jornada</span>
                    </div>
                    <div className="p-[18px] grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-[12.5px] font-medium text-muted-4">Clima</span>
                        <input
                          className="border border-line-input rounded-[7px] px-2.5 h-9 outline-none focus:border-brand text-sm"
                          placeholder="Ej. Soleado, con lluvia en la tarde"
                          value={form.clima}
                          onChange={(e) => setForm({ ...form, clima: e.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-[12.5px] font-medium text-muted-4">Personal en obra (total)</span>
                        <input
                          type="number"
                          min="0"
                          className="border border-line-input rounded-[7px] px-2.5 h-9 outline-none focus:border-brand font-mono text-sm"
                          value={form.personal_en_obra}
                          onChange={(e) => setForm({ ...form, personal_en_obra: Number(e.target.value) })}
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 sm:col-span-2">
                        <span className="text-[12.5px] font-medium text-muted-4">Resumen de lo ejecutado hoy</span>
                        <textarea
                          rows={2}
                          className="border border-line-input rounded-[7px] px-2.5 py-2 outline-none focus:border-brand resize-y text-sm"
                          value={form.resumen}
                          onChange={(e) => setForm({ ...form, resumen: e.target.value })}
                        />
                      </label>
                    </div>
                  </section>

                  {actividades.length > 0 && (
                    <section className="bg-white border border-line rounded-[10px]">
                      <div className="px-[18px] py-3.5 border-b border-line-soft flex items-baseline gap-2.5">
                        <span className="font-mono text-[11.5px] text-muted-3">02</span>
                        <span className="font-semibold text-sm">Avance por actividad</span>
                      </div>
                      <div className="p-[18px] flex flex-col gap-2">
                        {actividades.length > 0 && (
                          <div className="hidden sm:grid grid-cols-4 gap-2 px-3 text-[11.5px] font-medium text-muted-3">
                            <span>Actividad</span>
                            <span>Avance % hoy</span>
                            <span>Observaciones</span>
                            <span>Fotos</span>
                          </div>
                        )}
                        {actividades.map((a) => (
                          <div key={a.id} className="border border-line-soft rounded-[8px] p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                            <span className="text-sm text-muted-4">{a.nombre}</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder="% avanzado hoy"
                              className="border border-line-input rounded-md px-2 py-1 text-sm font-mono"
                              value={avancesPorActividad[a.id]?.avance_del_dia ?? ''}
                              onChange={(e) => actualizarAvance(a.id, 'avance_del_dia', e.target.value)}
                            />
                            <input
                              type="text"
                              placeholder="Observaciones"
                              className="border border-line-input rounded-md px-2 py-1 text-sm"
                              value={avancesPorActividad[a.id]?.observaciones ?? ''}
                              onChange={(e) => actualizarAvance(a.id, 'observaciones', e.target.value)}
                            />
                            <div>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                multiple
                                className="text-xs w-full"
                                onChange={(e) => actualizarAvance(a.id, 'archivos', Array.from(e.target.files))}
                              />
                              {avancesPorActividad[a.id]?.archivos?.length > 0 && (
                                <span className="text-xs text-muted-3">
                                  {avancesPorActividad[a.id].archivos.length} foto(s) seleccionada(s)
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,360px),1fr))' }}>
                    <ListaEditable
                      numero="03"
                      titulo="Personal en obra por cargo"
                      filas={personal}
                      columnas={[
                        { campo: 'cargo', label: 'Cargo', placeholder: 'Ej: oficial', tipo: 'text' },
                        { campo: 'cantidad', label: 'Cantidad', placeholder: 'Cantidad', tipo: 'number' },
                        { campo: 'horas_trabajadas', label: 'Horas trabajadas', placeholder: 'Horas', tipo: 'number' },
                      ]}
                      onAgregar={() => agregarFila(setPersonal, { cargo: '', cantidad: 1, horas_trabajadas: 8 })}
                      onActualizar={(i, c, v) => actualizarFila(setPersonal, i, c, v)}
                      onQuitar={(i) => quitarFila(setPersonal, i)}
                    />

                    <ListaEditable
                      numero="04"
                      titulo="Materiales usados"
                      filas={materiales}
                      columnas={[
                        { campo: 'material', label: 'Material', placeholder: 'Material', tipo: 'text' },
                        { campo: 'cantidad', label: 'Cantidad', placeholder: 'Cantidad', tipo: 'number' },
                        { campo: 'unidad', label: 'Unidad', placeholder: 'Ej: bultos', tipo: 'text' },
                      ]}
                      onAgregar={() => agregarFila(setMateriales, { material: '', cantidad: 0, unidad: '' })}
                      onActualizar={(i, c, v) => actualizarFila(setMateriales, i, c, v)}
                      onQuitar={(i) => quitarFila(setMateriales, i)}
                    />
                  </div>

                  <ListaEditable
                    numero="05"
                    titulo="Incidentes"
                    filas={incidentes}
                    columnas={[
                      { campo: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['seguridad', 'clima', 'tecnico', 'logistico', 'otro'] },
                      { campo: 'descripcion', label: 'Descripción', placeholder: 'Descripción', tipo: 'text' },
                      { campo: 'gravedad', label: 'Gravedad', tipo: 'select', opciones: ['baja', 'media', 'alta'] },
                      { campo: 'acciones_tomadas', label: 'Acciones tomadas', placeholder: 'Acciones tomadas', tipo: 'text' },
                    ]}
                    onAgregar={() => agregarFila(setIncidentes, { tipo: 'otro', descripcion: '', gravedad: 'baja', acciones_tomadas: '' })}
                    onActualizar={(i, c, v) => actualizarFila(setIncidentes, i, c, v)}
                    onQuitar={(i) => quitarFila(setIncidentes, i)}
                  />

                  <button
                    type="submit"
                    disabled={guardando}
                    className="self-start h-9 px-4 rounded-[7px] border border-brand-dark bg-brand text-white font-medium cursor-pointer hover:bg-brand-dark disabled:opacity-50 text-sm"
                  >
                    {guardando ? 'Guardando…' : 'Guardar registro (borrador)'}
                  </button>
                </form>
              </details>
            )}

            {registroSeleccionado ? (
              <div className="p-7 flex flex-col gap-4 max-w-[1180px]">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="m-0 text-xl font-semibold tracking-tight">Bitácora · {registroSeleccionado.fecha}</h1>
                    <Badge estado={ESTADO_BITACORA[registroSeleccionado.estado]} />
                  </div>
                  <div className="flex gap-2">
                    {registroSeleccionado.estado === 'borrador' && puedeCrear && (
                      <button
                        className="h-[34px] px-3.5 rounded-[7px] border border-brand-dark bg-brand text-white font-medium cursor-pointer hover:bg-brand-dark text-sm"
                        onClick={() => cambiarEstado(registroSeleccionado, 'enviada')}
                      >
                        Enviar para revisión
                      </button>
                    )}
                    {registroSeleccionado.estado === 'enviada' && puedeAprobar && (
                      <>
                        <button
                          className="h-[34px] px-3.5 rounded-[7px] border border-[#e6b3ad] bg-white text-status-rejected-fg font-medium cursor-pointer hover:bg-status-rejected-bg text-sm"
                          onClick={() => cambiarEstado(registroSeleccionado, 'rechazada')}
                        >
                          ✕ Rechazar
                        </button>
                        <button
                          className="h-[34px] px-4 rounded-[7px] border border-brand-dark bg-brand text-white font-medium cursor-pointer hover:bg-brand-dark text-sm"
                          onClick={() => cambiarEstado(registroSeleccionado, 'aprobada')}
                        >
                          ✓ Aprobar
                        </button>
                      </>
                    )}
                    {registroSeleccionado.estado === 'rechazada' && puedeCrear && (
                      <button
                        className="h-[34px] px-3.5 rounded-[7px] border border-line-input bg-white font-medium cursor-pointer hover:bg-[#f6f5f1] text-sm"
                        onClick={() => cambiarEstado(registroSeleccionado, 'borrador')}
                      >
                        Reabrir para corregir
                      </button>
                    )}
                  </div>
                </div>

                <span className="text-muted text-sm -mt-2">
                  {registroSeleccionado.personal_en_obra} personas · {registroSeleccionado.clima || 'sin clima registrado'}
                </span>

                {registroSeleccionado.motivo_rechazo && (
                  <div className="bg-status-rejected-bg border border-[#f0c9c4] rounded-[10px] px-[18px] py-3.5">
                    <span className="font-semibold text-status-rejected-fg text-sm">Motivo del rechazo</span>
                    <p className="m-0 text-[#6e2a23] text-sm leading-relaxed mt-1">{registroSeleccionado.motivo_rechazo}</p>
                  </div>
                )}

                <section className="bg-white border border-line rounded-[10px]">
                  <div className="px-[18px] py-3.5 border-b border-line-soft">
                    <span className="font-semibold text-sm">Resumen de lo ejecutado</span>
                  </div>
                  <p className="m-0 px-[18px] py-3.5 text-ink leading-relaxed text-sm">
                    {registroSeleccionado.resumen || 'Sin resumen.'}
                  </p>
                </section>

                {registroSeleccionado.registros_avance?.length > 0 && (
                  <section className="bg-white border border-line rounded-[10px]">
                    <div className="px-[18px] py-3.5 border-b border-line-soft">
                      <span className="font-semibold text-sm">Avance por actividad</span>
                    </div>
                    <div className="px-[18px]">
                      {registroSeleccionado.registros_avance.map((av, i) => (
                        <div key={av.id} className={`py-3 flex flex-col gap-2 ${i > 0 ? 'border-t border-line-softer' : ''}`}>
                          <span className="text-sm">
                            <span className="font-medium">{nombreActividad(av.actividad_id)}</span>{' '}
                            <span className="font-mono text-brand-text">+{av.avance_del_dia}%</span>
                            {av.observaciones ? <span className="text-muted-2"> — {av.observaciones}</span> : null}
                          </span>
                          {av.fotos?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {av.fotos.map((foto) => (
                                <FotoAvanceThumbnail
                                  key={foto.id}
                                  foto={foto}
                                  onEliminar={
                                    puedeCrear && ['borrador', 'rechazada'].includes(registroSeleccionado.estado)
                                      ? () => eliminarFotoDeAvance(foto.id)
                                      : null
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {registroSeleccionado.incidentes?.length > 0 && (
                  <section className="bg-white border border-line rounded-[10px]">
                    <div className="px-[18px] py-3.5 border-b border-line-soft">
                      <span className="font-semibold text-sm">Incidentes y novedades</span>
                    </div>
                    <div className="p-[18px] flex flex-col gap-2">
                      {registroSeleccionado.incidentes.map((inc) => (
                        <div key={inc.id} className="flex gap-2.5 items-start px-3 py-2.5 rounded-[8px] bg-[#fafaf7] border border-line-soft">
                          <span className="flex-none h-5 px-1.5 rounded text-[11.5px] font-medium inline-flex items-center bg-status-sent-bg text-status-sent-fg capitalize">
                            {inc.gravedad}
                          </span>
                          <span className="leading-relaxed text-muted-4 text-sm">
                            [{inc.tipo}] {inc.descripcion}
                            {inc.acciones_tomadas ? ` — ${inc.acciones_tomadas}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="p-7 text-muted-3 text-sm">
                {registros.length === 0
                  ? 'Esta obra todavía no tiene bitácoras registradas.'
                  : 'Selecciona una bitácora de la lista para ver el detalle.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FotoAvanceThumbnail({ foto, onEliminar }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let cancelado = false
    let urlCreada = null
    api
      .obtenerUrlFotoAvance(foto.id)
      .then((u) => {
        if (cancelado) {
          URL.revokeObjectURL(u)
          return
        }
        urlCreada = u
        setUrl(u)
      })
      .catch(() => {})
    return () => {
      cancelado = true
      if (urlCreada) URL.revokeObjectURL(urlCreada)
    }
  }, [foto.id])

  return (
    <div className="relative w-16 h-16">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" title={foto.nombre_original}>
          <img src={url} alt={foto.nombre_original} className="w-16 h-16 object-cover rounded-md border border-line" />
        </a>
      ) : (
        <div className="w-16 h-16 bg-line-soft rounded-md animate-pulse" />
      )}
      {onEliminar && (
        <button
          type="button"
          onClick={onEliminar}
          title="Eliminar foto"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 leading-none text-xs bg-white text-status-rejected-fg border border-[#e6b3ad] rounded-full"
        >
          ×
        </button>
      )}
    </div>
  )
}

function ListaEditable({ numero, titulo, filas, columnas, onAgregar, onActualizar, onQuitar }) {
  return (
    <section className="bg-white border border-line rounded-[10px]">
      <div className="px-[18px] py-3.5 border-b border-line-soft flex items-center justify-between gap-2.5">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-[11.5px] text-muted-3">{numero}</span>
          <span className="font-semibold text-sm">{titulo}</span>
        </div>
        <button type="button" className="text-sm text-brand hover:underline" onClick={onAgregar}>
          + Agregar
        </button>
      </div>
      <div className="p-[18px] flex flex-col gap-2">
        {filas.length > 0 && (
          <div
            className="hidden md:grid gap-2 px-0.5 md:grid-cols-[var(--cols)]"
            style={{ '--cols': `repeat(${columnas.length}, 1fr) auto` }}
          >
            {columnas.map((col) => (
              <span key={col.campo} className="text-[11.5px] font-medium text-muted-3">
                {col.label ?? col.placeholder}
              </span>
            ))}
            <span />
          </div>
        )}
        {filas.map((fila, i) => (
          <div
            key={i}
            className="grid gap-2 items-center grid-cols-1 md:grid-cols-[var(--cols)] p-2.5 md:p-0 rounded-md border border-line-soft md:border-0"
            style={{ '--cols': `repeat(${columnas.length}, 1fr) auto` }}
          >
            {columnas.map((col) => (
              <div key={col.campo} className="flex flex-col gap-1 md:contents">
                <span className="text-[11px] font-medium text-muted-3 md:hidden">{col.label ?? col.placeholder}</span>
                {col.tipo === 'select' ? (
                  <select
                    className="border border-line-input rounded-md px-2 py-1 text-sm bg-white"
                    value={fila[col.campo]}
                    onChange={(e) => onActualizar(i, col.campo, e.target.value)}
                  >
                    {col.opciones.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={col.tipo}
                    placeholder={col.placeholder}
                    className="border border-line-input rounded-md px-2 py-1 text-sm"
                    value={fila[col.campo]}
                    onChange={(e) => onActualizar(i, col.campo, col.tipo === 'number' ? Number(e.target.value) : e.target.value)}
                  />
                )}
              </div>
            ))}
            <button type="button" className="text-status-rejected-fg text-sm text-left md:text-center" onClick={() => onQuitar(i)}>
              Quitar
            </button>
          </div>
        ))}
        {filas.length === 0 && <p className="text-xs text-muted-3">Nada agregado todavía.</p>}
      </div>
    </section>
  )
}
