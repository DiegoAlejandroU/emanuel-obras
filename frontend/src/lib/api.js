import { borrarToken, obtenerToken } from './auth.js'

// "??" y no "||": en producción VITE_API_URL se define como cadena
// vacía a propósito (mismo origen, ver frontend/Dockerfile) y "" es
// falsy en JS, así que "||" la pisaría con el localhost de desarrollo.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

class ApiError extends Error {
  constructor(mensaje, errores) {
    super(mensaje)
    this.errores = errores || []
  }
}

async function descargarArchivo(path, nombreArchivo) {
  const token = obtenerToken()
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (res.status === 401) {
    borrarToken()
  }

  if (!res.ok) {
    let mensaje = res.statusText
    try {
      const data = await res.json()
      mensaje = data.mensaje || data.detail || mensaje
    } catch {
      // el cuerpo no era JSON, se usa el statusText
    }
    throw new ApiError(mensaje)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

async function obtenerImagenUrl(path) {
  const token = obtenerToken()
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (res.status === 401) {
    borrarToken()
  }
  if (!res.ok) {
    throw new ApiError(res.statusText)
  }

  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

async function request(path, options = {}) {
  const token = obtenerToken()
  const headers = { ...(options.headers || {}) }
  const esBodyEspecial = options.body instanceof URLSearchParams || options.body instanceof FormData
  if (!esBodyEspecial) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    borrarToken()
  }

  if (!res.ok) {
    let mensaje = res.statusText
    let errores = []
    try {
      const data = await res.json()
      mensaje = data.mensaje || data.detail || mensaje
      errores = data.errores || []
    } catch {
      // el cuerpo no era JSON, se usa el statusText
    }
    throw new ApiError(mensaje, errores)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Autenticación
  login: (email, password) => {
    const body = new URLSearchParams({ username: email, password })
    return request('/api/auth/login', { method: 'POST', body })
  },

  // Usuarios (solo administrador)
  listarUsuarios: () => request('/api/usuarios/'),
  crearUsuario: (data) => request('/api/usuarios/', { method: 'POST', body: JSON.stringify(data) }),

  // Obras
  listarObras: () => request('/api/obras/'),
  obtenerObra: (obraId) => request(`/api/obras/${obraId}`),
  crearObra: (data) => request('/api/obras/', { method: 'POST', body: JSON.stringify(data) }),
  actualizarObra: (obraId, data) => request(`/api/obras/${obraId}`, { method: 'PUT', body: JSON.stringify(data) }),
  cambiarEstadoObra: (obraId, estado) =>
    request(`/api/obras/${obraId}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }),
  eliminarObra: (obraId) => request(`/api/obras/${obraId}`, { method: 'DELETE' }),
  indicadoresObra: (obraId) => request(`/api/obras/${obraId}/indicadores`),
  historicoAvanceObra: (obraId) => request(`/api/obras/${obraId}/indicadores/historico`),

  // Actividades
  listarActividades: (obraId) => request(`/api/obras/${obraId}/actividades`),
  crearActividad: (obraId, data) =>
    request(`/api/obras/${obraId}/actividades`, { method: 'POST', body: JSON.stringify(data) }),
  actualizarActividad: (actividadId, data) =>
    request(`/api/actividades/${actividadId}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminarActividad: (actividadId) => request(`/api/actividades/${actividadId}`, { method: 'DELETE' }),

  // Bitácoras diarias
  listarBitacoras: (obraId) => request(`/api/obras/${obraId}/bitacoras`),
  obtenerBitacora: (bitacoraId) => request(`/api/bitacoras/${bitacoraId}`),
  crearBitacora: (obraId, data) =>
    request(`/api/obras/${obraId}/bitacoras`, { method: 'POST', body: JSON.stringify(data) }),
  actualizarBitacora: (bitacoraId, data) =>
    request(`/api/bitacoras/${bitacoraId}`, { method: 'PUT', body: JSON.stringify(data) }),
  cambiarEstadoBitacora: (bitacoraId, estado, motivoRechazo) =>
    request(`/api/bitacoras/${bitacoraId}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado, motivo_rechazo: motivoRechazo || null }),
    }),
  eliminarBitacora: (bitacoraId) => request(`/api/bitacoras/${bitacoraId}`, { method: 'DELETE' }),

  // Fotos de avance
  subirFotosAvance: (registroAvanceId, archivos) => {
    const formData = new FormData()
    archivos.forEach((archivo) => formData.append('archivos', archivo))
    return request(`/api/bitacoras/registros-avance/${registroAvanceId}/fotos`, {
      method: 'POST',
      body: formData,
    })
  },
  obtenerUrlFotoAvance: (fotoId) => obtenerImagenUrl(`/api/bitacoras/fotos/${fotoId}`),
  eliminarFotoAvance: (fotoId) => request(`/api/bitacoras/fotos/${fotoId}`, { method: 'DELETE' }),

  // Alertas
  listarAlertas: (obraId) => request(`/api/obras/${obraId}/alertas`),
  resolverAlerta: (alertaId) => request(`/api/alertas/${alertaId}/resolver`, { method: 'PATCH' }),

  // Reportes exportables (gerencia / interventoría)
  descargarReportePdf: (obraId, nombreObra) =>
    descargarArchivo(`/api/obras/${obraId}/reportes/pdf`, `reporte_${nombreObra}.pdf`),
  descargarReporteXlsx: (obraId, nombreObra) =>
    descargarArchivo(`/api/obras/${obraId}/reportes/xlsx`, `reporte_${nombreObra}.xlsx`),
}

export { API_URL, ApiError }
