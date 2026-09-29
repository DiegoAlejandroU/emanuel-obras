import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { ETIQUETA_ROL, inicialesRol } from '../lib/estilos.jsx'

const ROLES = ['administrador', 'residente_obra', 'interventor', 'gerencia']
const ROL_DOT = { administrador: '#1c1d1a', residente_obra: '#2f7d3a', interventor: '#c08a1e', gerencia: '#2563eb' }
const FORM_VACIO = { nombre: '', email: '', password: '', rol: 'residente_obra' }

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [form, setForm] = useState(FORM_VACIO)
  const [mensaje, setMensaje] = useState(null)
  const [formAbierto, setFormAbierto] = useState(false)

  function cargar() {
    api.listarUsuarios().then(setUsuarios).catch((err) => setMensaje(err.message))
  }

  useEffect(cargar, [])

  async function crear(e) {
    e.preventDefault()
    try {
      await api.crearUsuario(form)
      setForm(FORM_VACIO)
      setFormAbierto(false)
      setMensaje('Usuario creado.')
      cargar()
    } catch (err) {
      setMensaje(`Error al crear el usuario: ${err.message}`)
    }
  }

  return (
    <div className="p-7 flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <h1 className="m-0 text-[22px] font-semibold tracking-tight">Usuarios</h1>
          <span className="text-muted">{usuarios.length} usuario{usuarios.length === 1 ? '' : 's'} registrado{usuarios.length === 1 ? '' : 's'}</span>
        </div>
        <button
          onClick={() => setFormAbierto((v) => !v)}
          className="h-[34px] px-3.5 rounded-[7px] border border-brand-dark bg-brand text-white font-medium cursor-pointer hover:bg-brand-dark flex items-center gap-1.5 text-sm"
        >
          <span className="text-base leading-none">+</span> Nuevo usuario
        </button>
      </div>

      {mensaje && <p className="text-sm text-muted m-0">{mensaje}</p>}

      {formAbierto && (
        <form
          onSubmit={crear}
          className="bg-white border border-line rounded-[10px] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
        >
          <label className="flex flex-col gap-1.5 lg:col-span-1">
            <span className="text-[12.5px] font-medium text-muted-4">Nombre</span>
            <input
              className="h-[34px] border border-line-input rounded-[7px] px-2.5 outline-none focus:border-brand"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 lg:col-span-1">
            <span className="text-[12.5px] font-medium text-muted-4">Correo</span>
            <input
              type="email"
              className="h-[34px] border border-line-input rounded-[7px] px-2.5 outline-none focus:border-brand"
              placeholder="nombre@emanuelic.co"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 lg:col-span-1">
            <span className="text-[12.5px] font-medium text-muted-4">Contraseña</span>
            <input
              type="password"
              className="h-[34px] border border-line-input rounded-[7px] px-2.5 outline-none focus:border-brand"
              placeholder="mín. 8 caracteres"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 lg:col-span-1">
            <span className="text-[12.5px] font-medium text-muted-4">Rol</span>
            <select
              className="h-[34px] border border-line-input rounded-[7px] px-2 bg-white outline-none"
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ETIQUETA_ROL[r]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2 lg:col-span-1">
            <button
              type="button"
              onClick={() => setFormAbierto(false)}
              className="h-[34px] px-3 rounded-[7px] border border-line-input bg-white font-medium cursor-pointer hover:bg-[#f6f5f1] text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 h-[34px] px-3 rounded-[7px] border border-brand-dark bg-brand text-white font-medium cursor-pointer hover:bg-brand-dark text-sm"
            >
              Crear
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-line rounded-[10px] overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="grid grid-cols-[minmax(220px,2fr)_190px] gap-4 px-4 py-2.5 border-b border-line text-[11.5px] font-medium text-muted-2 uppercase tracking-wide">
            <span>Usuario</span>
            <span>Rol</span>
          </div>
          {usuarios.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[minmax(220px,2fr)_190px] gap-4 px-4 py-2.5 border-b border-line-soft items-center last:border-b-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex-none w-[30px] h-[30px] rounded-full bg-line text-muted-4 flex items-center justify-center text-[11.5px] font-semibold">
                  {u.nombre
                    ?.split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate text-sm">{u.nombre}</span>
                  <span className="text-xs text-muted-3 truncate">{u.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-none w-[7px] h-[7px] rounded-full" style={{ background: ROL_DOT[u.rol] || '#8a8b83' }} />
                <span className="text-sm">{ETIQUETA_ROL[u.rol] || u.rol}</span>
              </div>
            </div>
          ))}
          {usuarios.length === 0 && <div className="p-10 text-center text-muted-3">Todavía no hay usuarios registrados.</div>}
        </div>
      </div>
    </div>
  )
}
