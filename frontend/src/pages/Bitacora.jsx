import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8000'

export default function Bitacora() {
  const [obras, setObras] = useState([])
  const [obraId, setObraId] = useState(null)
  const [registros, setRegistros] = useState([])
  const [form, setForm] = useState({
    clima: '',
    personal_en_obra: 0,
    descripcion_general: '',
    incidentes: '',
    creado_por: '',
  })
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/obras/`)
      .then((res) => res.json())
      .then(setObras)
      .catch(() => setMensaje('No se pudo conectar con la API.'))
  }, [])

  useEffect(() => {
    if (!obraId) return
    fetch(`${API_URL}/bitacora/obra/${obraId}`)
      .then((res) => res.json())
      .then(setRegistros)
  }, [obraId])

  async function guardarRegistro(e) {
    e.preventDefault()
    if (!obraId) return

    const res = await fetch(`${API_URL}/bitacora/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ obra_id: Number(obraId), ...form, avances: [] }),
    })

    if (res.ok) {
      setMensaje('Registro guardado.')
      setForm({ clima: '', personal_en_obra: 0, descripcion_general: '', incidentes: '', creado_por: '' })
      const nuevos = await fetch(`${API_URL}/bitacora/obra/${obraId}`).then((r) => r.json())
      setRegistros(nuevos)
    } else {
      setMensaje('No se pudo guardar el registro.')
    }
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
        <form onSubmit={guardarRegistro} className="space-y-3 mb-8">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="border border-gray-300 rounded-md px-3 py-2"
              placeholder="Clima"
              value={form.clima}
              onChange={(e) => setForm({ ...form, clima: e.target.value })}
            />
            <input
              type="number"
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
          <button
            type="submit"
            className="bg-obra-600 text-white px-4 py-2 rounded-md hover:bg-obra-700"
          >
            Guardar registro
          </button>
          {mensaje && <p className="text-sm text-gray-600">{mensaje}</p>}
        </form>
      )}

      <div className="space-y-3">
        {registros.map((r) => (
          <div key={r.id} className="border border-gray-200 rounded-md p-3">
            <p className="text-sm text-gray-500">{r.fecha} — {r.personal_en_obra} personas — {r.clima}</p>
            <p className="text-gray-800">{r.descripcion_general}</p>
            {r.incidentes && <p className="text-red-600 text-sm mt-1">Incidente: {r.incidentes}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
