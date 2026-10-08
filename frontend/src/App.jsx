import { useEffect, useState } from 'react'
import Obras from './pages/Obras.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Bitacora from './pages/Bitacora.jsx'
import Usuarios from './pages/Usuarios.jsx'
import Login from './pages/Login.jsx'
import Layout from './components/Layout.jsx'
import { api } from './lib/api.js'
import { borrarToken, usuarioActualDesdeToken } from './lib/auth.js'

export default function App() {
  const [usuario, setUsuario] = useState(usuarioActualDesdeToken())
  const [tab, setTab] = useState('obras')

  // "Obra activa": estado compartido por el sidebar y por las pantallas de
  // Bitácora/Dashboard, que antes mantenían cada una su propio selector de
  // obra por separado. Vive aquí para que el selector del sidebar y ambas
  // pantallas queden sincronizados.
  const [obras, setObras] = useState([])
  const [obraActivaId, setObraActivaId] = useState(null)

  useEffect(() => {
    if (!usuario) return
    api.listarObras().then(setObras).catch(() => {})
  }, [usuario])

  // Los tokens emitidos antes de que el token llevara el nombre no lo traen:
  // se pide al backend para mostrar el nombre sin obligar a volver a iniciar sesión.
  const falta_nombre = Boolean(usuario) && !usuario.nombre
  useEffect(() => {
    if (!falta_nombre) return
    api
      .usuarioActual()
      .then((u) => setUsuario((prev) => (prev ? { ...prev, nombre: u.nombre } : prev)))
      .catch(() => {})
  }, [falta_nombre])

  if (!usuario) {
    return <Login onIngreso={() => setUsuario(usuarioActualDesdeToken())} />
  }

  const puedeEditarObras = ['administrador', 'gerencia'].includes(usuario.rol)

  const TABS = [
    { key: 'obras', label: 'Obras', count: obras.length },
    { key: 'bitacora', label: 'Bitácora' },
    { key: 'dashboard', label: 'Dashboard' },
    ...(usuario.rol === 'administrador' ? [{ key: 'usuarios', label: 'Usuarios' }] : []),
  ]

  function cerrarSesion() {
    borrarToken()
    setUsuario(null)
  }

  const obraActiva = obras.find((o) => String(o.id) === String(obraActivaId))
  const crumbLeaf =
    tab === 'obras'
      ? 'Todas las obras'
      : tab === 'usuarios'
        ? 'Usuarios'
        : obraActiva
          ? obraActiva.nombre
          : 'Selecciona una obra'

  return (
    <Layout
      usuario={usuario}
      tabs={TABS}
      tabActivo={tab}
      onTabChange={setTab}
      obras={obras}
      obraActivaId={obraActivaId}
      onObraActivaChange={setObraActivaId}
      mostrarSelectorObra={tab === 'bitacora' || tab === 'dashboard'}
      crumbLeaf={crumbLeaf}
      onCerrarSesion={cerrarSesion}
    >
      {tab === 'obras' && <Obras puedeEditar={puedeEditarObras} onObrasCambian={setObras} />}
      {tab === 'bitacora' && <Bitacora obras={obras} obraId={obraActivaId} onObraIdChange={setObraActivaId} />}
      {tab === 'dashboard' && <Dashboard obras={obras} obraId={obraActivaId} onObraIdChange={setObraActivaId} />}
      {tab === 'usuarios' && usuario.rol === 'administrador' && <Usuarios />}
    </Layout>
  )
}
