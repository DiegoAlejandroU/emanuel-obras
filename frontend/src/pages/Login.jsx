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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <form onSubmit={enviar} className="bg-white border border-gray-200 rounded-lg p-8 w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Emanuel Ingeniería y Construcciones</h1>
          <p className="text-sm text-gray-500">Ejecución y seguimiento de obras</p>
        </div>

        <label className="block text-sm text-gray-600">
          Correo
          <input
            type="email"
            required
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block text-sm text-gray-600">
          Contraseña
          <input
            type="password"
            required
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-obra-600 text-white px-4 py-2 rounded-md hover:bg-obra-700 disabled:opacity-50"
        >
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>

        <p className="text-xs text-gray-400">
          ¿No tienes cuenta? Pídele a un administrador que te cree una desde la pestaña Usuarios.
        </p>
      </form>
    </div>
  )
}
