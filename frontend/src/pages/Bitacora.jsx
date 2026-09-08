import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const FORM_VACIO = {
  clima: '',
  personal_en_obra: 0,
  descripcion_general: '',
  incidentes: '',
  creado_por: '',
}

export default function Bitacora() {
  const [obras, setObras] = useState([])
  const [obraId, setObraId] = useState(null)
  const [actividades, setActividades] = useState([])
  const [registros, setRegistros] = useState([])
  const [form, setForm] = useState(FORM_VACIO)
  const [avancesPorActividad, setAvancesPorActividad] = useState({})
  const [mensaje, setMensaje] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    api.listarObras().then(setObras).catch(() => setMensaje('No se pudo conectar con la API.'))
  }, [])

  useEffect(() => {
    if (!obraId) {
      setActividades([])
      setRegistros([])
      return
    }
    api.listarActividades(obraId).then(setActividades).catch(() => setMensaje('No se pudieron cargar las actividades.'))
    api.listarRegistrosBitacora(obraId).then(setRegistros).catch(() => setMensaje('No se pudo cargar el historial.'))
    setAvancesPorActividad({})
  }, [obraId])

  function actualizarAvance(actividadId, campo, valor) {
    setAvancesPorActividad((prev) => ({
      ...prev,
      [actividadId]: { ...prev[actividadId], [campo]: valor },
    }))
  }

  async function guardarRegistro(e) {
    e.preventDefault()
    if (!obraId) return
    setGuardando(true)
    setMensaje(null)

    const avances = Object.entries(avancesPorActividad)
      .map(([actividadId, valores]) => ({
        actividad_id: Number(actividadId),
        avance_incremental: Number(valores.avance_incremental) || 0,
        materiales_usados: valores.materiales_usados || null,
        costo_estimado_dia: Number(valores.costo_estimado_dia) || 0,
      }))
      .filter((a) => a.avance_incremental > 0 || a.materiales_usados || a.costo_estimado_dia > 0)

    try {
      await api.crearRegistroBitacora({ obra_id: Number(obraId), ...form, avances })
      setMensaje('Registro guardado.')
      setForm(FORM_VACIO)
      setAvancesPorActividad({})
      const [nuevosRegistros, actividadesActualizadas] = await Promise.all([
        api.listarRegistrosBitacora(obraId),
        api.listarActividades(obraId),
      ])
      setRegistros(nuevosRegistros)
      setActividades(actividadesActualizadas)
    } catch (err) {
      setMensaje(`No se pudo guardar el registro: ${err.message}`)
    } finally {
      setGuardando(false)
    }
  }

  function nombreActividad(actividadId) {
    return actividades.find((a) => a.id === actividadId)?.nombre ?? `Actividad #${actividadId}`
  }

  return (
    <div className="max-w-2xl">
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

      {obraId && (
        <form onSubmit={guardarRegistro} className="space-y-4 mb-8">
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
              placeholder="Personal en obra"
              value={form.personal_en_obra}
              onChange={(e) => setForm({ ...form, personal_en_obra: Number(e.target.value) })}
            />
          </div>
          <textarea
            className="border border-gray-300 rounded-md px-3 py-2 w-full"
            placeholder="Actividades ejecutadas hoy"
            value={form.descripcion_general}
            onChange={(e) => setForm({ ...form, descripcion_general: e.target.value })}
          />
          <textarea
            className="border border-gray-300 rounded-md px-3 py-2 w-full"
            placeholder="Incidentes (opcional)"
            value={form.incidentes}
            onChange={(e) => setForm({ ...form, incidentes: e.target.value })}
          />
          <input
            className="border border-gray-300 rounded-md px-3 py-2 w-full"
            placeholder="Registrado por"
            value={form.creado_por}
            onChange={(e) => setForm({ ...form, creado_por: e.target.value })}
          />

          {actividades.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Avance por actividad</h3>
              <div className="space-y-2">
                {actividades.map((a) => (
                  <div key={a.id} className="border border-gray-200 rounded-md p-3 grid grid-cols-4 gap-2 items-center">
                    <span className="text-sm text-gray-700">
                      {a.nombre}
                      <span className="block text-xs text-gray-400">{a.avance_porcentual}% acumulado</span>
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="% avanzado hoy"
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                      value={avancesPorActividad[a.id]?.avance_incremental ?? ''}
                      onChange={(e) => actualizarAvance(a.id, 'avance_incremental', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Materiales usados"
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                      value={avancesPorActividad[a.id]?.materiales_usados ?? ''}
                      onChange={(e) => actualizarAvance(a.id, 'materiales_usados', e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="Costo del día"
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                      value={avancesPorActividad[a.id]?.costo_estimado_dia ?? ''}
                      onChange={(e) => actualizarAvance(a.id, 'costo_estimado_dia', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-600">
              Esta obra no tiene actividades definidas todavía. Créalas en la pestaña "Obras" para poder registrar
              avance por actividad.
            </p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="bg-obra-600 text-white px-4 py-2 rounded-md hover:bg-obra-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar registro'}
          </button>
          {mensaje && <p className="text-sm text-gray-600">{mensaje}</p>}
        </form>
      )}

      <div className="space-y-3">
        {registros.map((r) => (
          <div key={r.id} className="border border-gray-200 rounded-md p-3">
            <p className="text-sm text-gray-500">
              {r.fecha} — {r.personal_en_obra} personas — {r.clima}
            </p>
            <p className="text-gray-800">{r.descripcion_general}</p>
            {r.incidentes && <p className="text-red-600 text-sm mt-1">Incidente: {r.incidentes}</p>}
            {r.avances_actividades?.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                {r.avances_actividades.map((av) => (
                  <li key={av.id}>
                    {nombreActividad(av.actividad_id)}: +{av.avance_incremental}%
                    {av.materiales_usados ? ` — ${av.materiales_usados}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
