import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const ROLES = ['administrador', 'residente_obra', 'interventor', 'gerencia']
const FORM_VACIO = { nombre: '', email: '', password: '', rol: 'residente_obra' }

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [form, setForm] = useState(FORM_VACIO)
  const [mensaje, setMensaje] = useState(null)

  function cargar() {
    api.listarUsuarios().then(setUsuarios).catch((err) => setMensaje(err.message))
  }

  useEffect(cargar, [])

  async function crear(e) {
    e.preventDefault()
    try {
      await api.crearUsuario(form)
      setForm(FORM_VACIO)
      setMensaje('Usuario creado.')
      cargar()
    } catch (err) {
      setMensaje(`Error al crear el usuario: ${err.message}`)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Usuarios</h2>
      {mensaje && <p className="text-sm text-gray-600">{mensaje}</p>}

      <form onSubmit={crear} className="grid grid-cols-2 gap-3 border border-gray-200 rounded-md p-4">
        <input
          className="border border-gray-300 rounded-md px-3 py-2"
          placeholder="Nombre completo"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          required
        />
        <input
          type="email"
          className="border border-gray-300 rounded-md px-3 py-2"
          placeholder="Correo"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          className="border border-gray-300 rounded-md px-3 py-2"
          placeholder="Contraseña (mín. 8 caracteres)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={8}
          required
        />
        <select
          className="border border-gray-300 rounded-md px-3 py-2"
          value={form.rol}
          onChange={(e) => setForm({ ...form, rol: e.target.value })}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="submit" className="col-span-2 bg-obra-600 text-white px-4 py-2 rounded-md hover:bg-obra-700">
          Crear usuario
        </button>
      </form>

      <div className="space-y-2">
        {usuarios.map((u) => (
          <div key={u.id} className="border border-gray-200 rounded-md p-3 flex justify-between">
            <div>
              <p className="font-medium text-gray-800">{u.nombre}</p>
              <p className="text-sm text-gray-500">{u.email}</p>
            </div>
            <span className="text-sm text-gray-600 self-center">{u.rol}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
