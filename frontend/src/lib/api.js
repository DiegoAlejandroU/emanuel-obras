const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = data.detail || detail
    } catch {
      // el cuerpo no era JSON, se usa el statusText
    }
    throw new Error(detail)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Obras
  listarObras: () => request('/obras/'),
  crearObra: (data) => request('/obras/', { method: 'POST', body: JSON.stringify(data) }),
  actualizarObra: (obraId, data) =>
    request(`/obras/${obraId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  eliminarObra: (obraId) => request(`/obras/${obraId}`, { method: 'DELETE' }),

  // Actividades
  listarActividades: (obraId) => request(`/obras/${obraId}/actividades`),
  crearActividad: (obraId, data) =>
    request(`/obras/${obraId}/actividades`, { method: 'POST', body: JSON.stringify(data) }),
  actualizarActividad: (obraId, actividadId, data) =>
    request(`/obras/${obraId}/actividades/${actividadId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  eliminarActividad: (obraId, actividadId) =>
    request(`/obras/${obraId}/actividades/${actividadId}`, { method: 'DELETE' }),

  // Bitácora
  listarRegistrosBitacora: (obraId) => request(`/bitacora/obra/${obraId}`),
  crearRegistroBitacora: (data) => request('/bitacora/', { method: 'POST', body: JSON.stringify(data) }),

  // Dashboard
  indicadoresObra: (obraId) => request(`/dashboard/obra/${obraId}`),
}

export { API_URL }
