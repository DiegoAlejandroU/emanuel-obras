import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const ESTADOS = ['activa', 'suspendida', 'finalizada']

const OBRA_VACIA = {
  nombre: '',
  ubicacion: '',
  fecha_inicio: '',
  fecha_fin_estimada: '',
  presupuesto_total: 0,
  estado: 'activa',
}

const ACTIVIDAD_VACIA = { nombre: '', peso_porcentual: 0, presupuesto_asignado: 0 }

export default function Obras() {
  const [obras, setObras] = useState([])
  const [obraSeleccionada, setObraSeleccionada] = useState(null)
  const [actividades, setActividades] = useState([])

  const [formObra, setFormObra] = useState(OBRA_VACIA)
  const [editandoObraId, setEditandoObraId] = useState(null)

  const [formActividad, setFormActividad] = useState(ACTIVIDAD_VACIA)
  const [editandoActividadId, setEditandoActividadId] = useState(null)

  const [mensaje, setMensaje] = useState(null)

  function cargarObras() {
    api
      .listarObras()
      .then((data) => {
        setObras(data)
        // mantiene sincronizada la obra seleccionada con los datos frescos
        if (obraSeleccionada) {
          const actualizada = data.find((o) => o.id === obraSeleccionada.id)
          setObraSeleccionada(actualizada || null)
        }
      })
      .catch(() => setMensaje('No se pudo conectar con la API.'))
  }

  useEffect(() => {
    cargarObras()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cargarActividades(obraId) {
    api
      .listarActividades(obraId)
      .then(setActividades)
      .catch(() => setMensaje('No se pudieron cargar las actividades.'))
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
      cargarObras()
    } catch (err) {
      setMensaje(`Error al guardar la obra: ${err.message}`)
    }
  }

  function editarObra(obra) {
    setEditandoObraId(obra.id)
    setFormObra({
      nombre: obra.nombre,
      ubicacion: obra.ubicacion || '',
      fecha_inicio: obra.fecha_inicio || '',
      fecha_fin_estimada: obra.fecha_fin_estimada || '',
      presupuesto_total: obra.presupuesto_total || 0,
      estado: obra.estado || 'activa',
    })
  }

  function cancelarEdicionObra() {
    setEditandoObraId(null)
    setFormObra(OBRA_VACIA)
  }

  async function eliminarObra(obra) {
    if (!window.confirm(`¿Eliminar la obra "${obra.nombre}"? Esto borra también su bitácora y actividades.`)) {
      return
    }
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
        peso_porcentual: Number(formActividad.peso_porcentual) || 0,
        presupuesto_asignado: Number(formActividad.presupuesto_asignado) || 0,
      }
      if (editandoActividadId) {
        await api.actualizarActividad(obraSeleccionada.id, editandoActividadId, payload)
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
      peso_porcentual: actividad.peso_porcentual,
      presupuesto_asignado: actividad.presupuesto_asignado,
    })
  }

  function cancelarEdicionActividad() {
    setEditandoActividadId(null)
    setFormActividad(ACTIVIDAD_VACIA)
  }

  async function eliminarActividad(actividad) {
    if (!obraSeleccionada) return
    if (!window.confirm(`¿Eliminar la actividad "${actividad.nombre}"?`)) return
    try {
      await api.eliminarActividad(obraSeleccionada.id, actividad.id)
      cargarActividades(obraSeleccionada.id)
    } catch (err) {
      setMensaje(`Error al eliminar la actividad: ${err.message}`)
    }
  }

  const sumaPesos = actividades.reduce((acc, a) => acc + (a.peso_porcentual || 0), 0)

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Obras</h2>
        {mensaje && <p className="text-sm text-gray-600 mb-3">{mensaje}</p>}

        <form onSubmit={guardarObra} className="grid grid-cols-2 gap-3 mb-6 border border-gray-200 rounded-md p-4">
          <input
            className="border border-gray-300 rounded-md px-3 py-2"
            placeholder="Nombre de la obra"
            value={formObra.nombre}
            onChange={(e) => setFormObra({ ...formObra, nombre: e.target.value })}
            required
          />
          <input
            className="border border-gray-300 rounded-md px-3 py-2"
            placeholder="Ubicación"
            value={formObra.ubicacion}
            onChange={(e) => setFormObra({ ...formObra, ubicacion: e.target.value })}
          />
          <label className="text-xs text-gray-500 flex flex-col gap-1">
            Fecha de inicio
            <input
              type="date"
              className="border border-gray-300 rounded-md px-3 py-2"
              value={formObra.fecha_inicio}
              onChange={(e) => setFormObra({ ...formObra, fecha_inicio: e.target.value })}
            />
          </label>
          <label className="text-xs text-gray-500 flex flex-col gap-1">
            Fecha fin estimada
            <input
              type="date"
              className="border border-gray-300 rounded-md px-3 py-2"
              value={formObra.fecha_fin_estimada}
              onChange={(e) => setFormObra({ ...formObra, fecha_fin_estimada: e.target.value })}
            />
          </label>
          <input
            type="number"
            min="0"
            className="border border-gray-300 rounded-md px-3 py-2"
            placeholder="Presupuesto total"
            value={formObra.presupuesto_total}
            onChange={(e) => setFormObra({ ...formObra, presupuesto_total: e.target.value })}
          />
          <select
            className="border border-gray-300 rounded-md px-3 py-2"
            value={formObra.estado}
            onChange={(e) => setFormObra({ ...formObra, estado: e.target.value })}
          >
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="bg-obra-600 text-white px-4 py-2 rounded-md hover:bg-obra-700">
              {editandoObraId ? 'Guardar cambios' : 'Crear obra'}
            </button>
            {editandoObraId && (
              <button
                type="button"
                className="px-4 py-2 rounded-md text-gray-500 hover:text-gray-700"
                onClick={cancelarEdicionObra}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="space-y-2">
          {obras.map((o) => (
            <div
              key={o.id}
              className={`border rounded-md p-3 flex items-center justify-between cursor-pointer ${
                obraSeleccionada?.id === o.id ? 'border-obra-600 bg-obra-50' : 'border-gray-200'
              }`}
              onClick={() => setObraSeleccionada(o)}
            >
              <div>
                <p className="font-medium text-gray-800">{o.nombre}</p>
                <p className="text-sm text-gray-500">
                  {o.ubicacion} — {o.estado} — ${Number(o.presupuesto_total).toLocaleString('es-CO')}
                </p>
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button className="text-sm text-obra-700 hover:underline" onClick={() => editarObra(o)}>
                  Editar
                </button>
                <button className="text-sm text-red-600 hover:underline" onClick={() => eliminarObra(o)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {obras.length === 0 && <p className="text-sm text-gray-500">Todavía no hay obras registradas.</p>}
        </div>
      </div>

      {obraSeleccionada && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Actividades de "{obraSeleccionada.nombre}"
            <span className={`ml-2 text-sm font-normal ${sumaPesos === 100 ? 'text-green-600' : 'text-amber-600'}`}>
              (suma de pesos: {sumaPesos}%{sumaPesos !== 100 ? ' — debería sumar 100%' : ''})
            </span>
          </h3>

          <form
            onSubmit={guardarActividad}
            className="grid grid-cols-4 gap-3 mb-4 border border-gray-200 rounded-md p-4"
          >
            <input
              className="border border-gray-300 rounded-md px-3 py-2 col-span-2"
              placeholder="Nombre de la actividad"
              value={formActividad.nombre}
              onChange={(e) => setFormActividad({ ...formActividad, nombre: e.target.value })}
              required
            />
            <input
              type="number"
              min="0"
              max="100"
              className="border border-gray-300 rounded-md px-3 py-2"
              placeholder="% del total"
              value={formActividad.peso_porcentual}
              onChange={(e) => setFormActividad({ ...formActividad, peso_porcentual: e.target.value })}
            />
            <input
              type="number"
              min="0"
              className="border border-gray-300 rounded-md px-3 py-2"
              placeholder="Presupuesto asignado"
              value={formActividad.presupuesto_asignado}
              onChange={(e) => setFormActividad({ ...formActividad, presupuesto_asignado: e.target.value })}
            />
            <div className="col-span-4 flex gap-2">
              <button type="submit" className="bg-obra-600 text-white px-4 py-2 rounded-md hover:bg-obra-700 text-sm">
                {editandoActividadId ? 'Guardar cambios' : 'Agregar actividad'}
              </button>
              {editandoActividadId && (
                <button
                  type="button"
                  className="px-4 py-2 rounded-md text-gray-500 hover:text-gray-700 text-sm"
                  onClick={cancelarEdicionActividad}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="space-y-2">
            {actividades.map((a) => (
              <div key={a.id} className="border border-gray-200 rounded-md p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{a.nombre}</p>
                  <p className="text-sm text-gray-500">
                    Peso: {a.peso_porcentual}% — Presupuesto: ${Number(a.presupuesto_asignado).toLocaleString('es-CO')}{' '}
                    — Avance: {a.avance_porcentual}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="text-sm text-obra-700 hover:underline" onClick={() => editarActividad(a)}>
                    Editar
                  </button>
                  <button className="text-sm text-red-600 hover:underline" onClick={() => eliminarActividad(a)}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
            {actividades.length === 0 && (
              <p className="text-sm text-gray-500">Esta obra no tiene actividades todavía.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
