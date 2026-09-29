import { useState } from 'react'
import { api } from '../lib/api.js'
import { guardarToken } from '../lib/auth.js'

export default function Login({ onIngreso }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      const { access_token: token } = await api.login(email, password)
      guardarToken(token)
      onIngreso()
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] bg-white font-sans text-ink">
      <div className="hidden md:flex bg-brand-darker text-brand-soft px-14 py-12 flex-col justify-between gap-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-soft text-brand-darker flex items-center justify-center font-bold text-sm tracking-tight">
            EI
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-sm">Emanuel</span>
            <span className="text-[12.5px] text-brand-mute">Ingeniería y Construcciones</span>
          </div>
        </div>
        <div className="flex flex-col gap-5 max-w-[460px]">
          <span className="font-mono text-xs tracking-widest uppercase text-brand-mute2">
            Sistema de Ejecución y Seguimiento
          </span>
          <h1 className="m-0 text-4xl leading-[1.1] font-semibold tracking-tight text-balance">
            Cada obra, cada jornada, registrada y verificable.
          </h1>
          <p className="m-0 text-[15px] leading-relaxed text-brand-mute3">
            Bitácoras diarias, avance físico y financiero, y aprobación de interventoría en un solo lugar.
          </p>
        </div>
        <div className="flex gap-10 text-[12.5px] text-brand-mute2 font-mono">
          <span>Sistema de Ejecución de Obras</span>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={enviar} className="w-full max-w-[400px] flex flex-col gap-7">
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 text-2xl font-semibold tracking-tight">Iniciar sesión</h2>
            <p className="m-0 text-muted">Emanuel Ingeniería y Construcciones — Ejecución y seguimiento de obras.</p>
          </div>

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-muted-4">Correo</span>
              <input
                type="email"
                required
                className="h-[38px] border border-line-input rounded-[7px] px-3 bg-white outline-none focus:border-brand focus:shadow-focus"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-muted-4">Contraseña</span>
              <input
                type="password"
                required
                className="h-[38px] border border-line-input rounded-[7px] px-3 bg-white outline-none focus:border-brand focus:shadow-focus"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          </div>

          {error && <p className="text-sm text-status-rejected-fg m-0">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="h-10 rounded-[7px] border border-brand-dark bg-brand text-white font-medium cursor-pointer hover:bg-brand-dark disabled:opacity-50"
          >
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>

          <p className="text-xs text-muted-3 m-0">
            ¿No tienes cuenta? Pídele a un administrador que te cree una desde la pestaña Usuarios.
          </p>
        </form>
      </div>
    </div>
  )
}
