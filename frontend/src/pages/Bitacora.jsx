import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { usuarioActualDesdeToken } from '../lib/auth.js'

const FORM_VACIO = { clima: '', personal_en_obra: 0, resumen: '' }

const ESTADO_ETIQUETA = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
}

const ESTADO_COLOR = {
  borrador: 'bg-gray-100 text-gray-700',
  enviada: 'bg-amber-100 text-amber-700',
  aprobada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
}

export default function Bitacora() {
  const usuario = usuarioActualDesdeToken()
  const puedeCrear = usuario && ['administrador', 'residente_obra'].includes(usuario.rol)
  const puedeAprobar = usuario && usuario.rol === 'interventor'

  const [obras, setObras] = useState([])
  const [obraId, setObraId] = useState(null)
  const [actividades, setActividades] = useState([])
  const [registros, setRegistros] = useState([])

  const [form, setForm] = useState(FORM_VACIO)
  const [avancesPorActividad, setAvancesPorActividad] = useState({})
  const [personal, setPersonal] = useState([])
  const [materiales, setMateriales] = useState([])
  const [incidentes, setIncidentes] = useState([])

  const [mensaje, setMensaje] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    api.listarObras().then(setObras).catch((err) => setMensaje(err.message))
  }, [])

  function cargarObra(id) {
    if (!id) {
      setActividades([])
      setRegistros([])
      return
    }
    api.listarActividades(id).then(setActividades).catch((err) => setMensaje(err.message))
    api.listarBitacoras(id).then(setRegistros).catch((err) => setMensaje(err.message))
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

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Bitácora diaria de obra</h2>

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

      {mensaje && <p className="text-sm text-gray-600 mb-4">{mensaje}</p>}

      {obraId && puedeCrear && (
        <form onSubmit={guardarRegistro} className="space-y-4 mb-8 border border-gray-200 rounded-md p-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="border border-gray-300 rounded-md px-3 py-2"
              placeholder="Clima"
              value={form.clima}
              onChange={(e) => setForm({ ...form, clima: e.target.value })}
            />
            <input
              type="number"
              min="0"
              className="border border-gray-300 rounded-md px-3 py-2"
              placeholder="Personal en obra (total)"
              value={form.personal_en_obra}
              onChange={(e) => setForm({ ...form, personal_en_obra: Number(e.target.value) })}
            />
          </div>
          <textarea
            className="border border-gray-300 rounded-md px-3 py-2 w-full"
            placeholder="Resumen de lo ejecutado hoy"
            value={form.resumen}
            onChange={(e) => setForm({ ...form, resumen: e.target.value })}
          />

          {actividades.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Avance por actividad</h3>
              <div className="space-y-2">
                {actividades.map((a) => (
                  <div key={a.id} className="border border-gray-200 rounded-md p-3 grid grid-cols-4 gap-2 items-center">
                    <span className="text-sm text-gray-700">{a.nombre}</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="% avanzado hoy"
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                      value={avancesPorActividad[a.id]?.avance_del_dia ?? ''}
                      onChange={(e) => actualizarAvance(a.id, 'avance_del_dia', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Observaciones"
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
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
                        <span className="text-xs text-gray-500">
                          {avancesPorActividad[a.id].archivos.length} foto(s) seleccionada(s)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ListaEditable
            titulo="Personal en obra por cargo"
            filas={personal}
            columnas={[
              { campo: 'cargo', placeholder: 'Cargo (ej: oficial)', tipo: 'text' },
              { campo: 'cantidad', placeholder: 'Cantidad', tipo: 'number' },
              { campo: 'horas_trabajadas', placeholder: 'Horas trabajadas', tipo: 'number' },
            ]}
            plantilla={{ cargo: '', cantidad: 1, horas_trabajadas: 8 }}
            onAgregar={() => agregarFila(setPersonal, { cargo: '', cantidad: 1, horas_trabajadas: 8 })}
            onActualizar={(i, c, v) => actualizarFila(setPersonal, i, c, v)}
            onQuitar={(i) => quitarFila(setPersonal, i)}
          />

          <ListaEditable
            titulo="Materiales usados"
            filas={materiales}
            columnas={[
              { campo: 'material', placeholder: 'Material', tipo: 'text' },
              { campo: 'cantidad', placeholder: 'Cantidad', tipo: 'number' },
              { campo: 'unidad', placeholder: 'Unidad (ej: bultos)', tipo: 'text' },
            ]}
            onAgregar={() => agregarFila(setMateriales, { material: '', cantidad: 0, unidad: '' })}
            onActualizar={(i, c, v) => actualizarFila(setMateriales, i, c, v)}
            onQuitar={(i) => quitarFila(setMateriales, i)}
          />

          <ListaEditable
            titulo="Incidentes"
            filas={incidentes}
            columnas={[
              {
                campo: 'tipo',
                placeholder: 'Tipo',
                tipo: 'select',
                opciones: ['seguridad', 'clima', 'tecnico', 'logistico', 'otro'],
              },
              { campo: 'descripcion', placeholder: 'Descripción', tipo: 'text' },
              { campo: 'gravedad', placeholder: 'Gravedad', tipo: 'select', opciones: ['baja', 'media', 'alta'] },
              { campo: 'acciones_tomadas', placeholder: 'Acciones tomadas', tipo: 'text' },
            ]}
            onAgregar={() =>
              agregarFila(setIncidentes, { tipo: 'otro', descripcion: '', gravedad: 'baja', acciones_tomadas: '' })
            }
            onActualizar={(i, c, v) => actualizarFila(setIncidentes, i, c, v)}
            onQuitar={(i) => quitarFila(setIncidentes, i)}
          />

          <button
            type="submit"
            disabled={guardando}
            className="bg-obra-600 text-white px-4 py-2 rounded-md hover:bg-obra-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar registro (borrador)'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {registros.map((r) => (
          <div key={r.id} className="border border-gray-200 rounded-md p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {r.fecha} — {r.personal_en_obra} personas — {r.clima}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[r.estado]}`}>
                {ESTADO_ETIQUETA[r.estado]}
              </span>
            </div>
            <p className="text-gray-800">{r.resumen}</p>
            {r.motivo_rechazo && <p className="text-red-600 text-sm mt-1">Motivo del rechazo: {r.motivo_rechazo}</p>}

            {r.registros_avance?.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                {r.registros_avance.map((av) => (
                  <li key={av.id}>
                    {nombreActividad(av.actividad_id)}: +{av.avance_del_dia}%
                    {av.observaciones ? ` — ${av.observaciones}` : ''}
                    {av.fotos?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1 mb-2 ml-4">
                        {av.fotos.map((foto) => (
                          <FotoAvanceThumbnail
                            key={foto.id}
                            foto={foto}
                            onEliminar={
                              puedeCrear && ['borrador', 'rechazada'].includes(r.estado)
                                ? () => eliminarFotoDeAvance(foto.id)
                                : null
                            }
                          />
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {r.incidentes?.length > 0 && (
              <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                {r.incidentes.map((inc) => (
                  <li key={inc.id}>
                    [{inc.tipo}/{inc.gravedad}] {inc.descripcion}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex gap-3">
              {r.estado === 'borrador' && puedeCrear && (
                <button className="text-sm text-obra-700 hover:underline" onClick={() => cambiarEstado(r, 'enviada')}>
                  Enviar para revisión
                </button>
              )}
              {r.estado === 'enviada' && puedeAprobar && (
                <>
                  <button
                    className="text-sm text-green-700 hover:underline"
                    onClick={() => cambiarEstado(r, 'aprobada')}
                  >
                    Aprobar
                  </button>
                  <button className="text-sm text-red-600 hover:underline" onClick={() => cambiarEstado(r, 'rechazada')}>
                    Rechazar
                  </button>
                </>
              )}
              {r.estado === 'rechazada' && puedeCrear && (
                <button className="text-sm text-obra-700 hover:underline" onClick={() => cambiarEstado(r, 'borrador')}>
                  Reabrir para corregir
                </button>
              )}
            </div>
          </div>
        ))}
        {obraId && registros.length === 0 && (
          <p className="text-sm text-gray-500">Esta obra todavía no tiene bitácoras registradas.</p>
        )}
      </div>
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
          <img
            src={url}
            alt={foto.nombre_original}
            className="w-16 h-16 object-cover rounded-md border border-gray-200"
          />
        </a>
      ) : (
        <div className="w-16 h-16 bg-gray-100 rounded-md animate-pulse" />
      )}
      {onEliminar && (
        <button
          type="button"
          onClick={onEliminar}
          title="Eliminar foto"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 leading-none text-xs bg-white text-red-600 border border-red-200 rounded-full"
        >
          ×
        </button>
      )}
    </div>
  )
}

function ListaEditable({ titulo, filas, columnas, onAgregar, onActualizar, onQuitar }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-600">{titulo}</h3>
        <button type="button" className="text-sm text-obra-700 hover:underline" onClick={onAgregar}>
          + Agregar
        </button>
      </div>
      <div className="space-y-2">
        {filas.map((fila, i) => (
          <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: `repeat(${columnas.length}, 1fr) auto` }}>
            {columnas.map((col) =>
              col.tipo === 'select' ? (
                <select
                  key={col.campo}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
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
                  key={col.campo}
                  type={col.tipo}
                  placeholder={col.placeholder}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  value={fila[col.campo]}
                  onChange={(e) => onActualizar(i, col.campo, col.tipo === 'number' ? Number(e.target.value) : e.target.value)}
                />
              )
            )}
            <button type="button" className="text-red-600 text-sm" onClick={() => onQuitar(i)}>
              Quitar
            </button>
          </div>
        ))}
        {filas.length === 0 && <p className="text-xs text-gray-400">Nada agregado todavía.</p>}
      </div>
    </div>
  )
}
