const CLAVE_TOKEN = 'eo_token'

export function guardarToken(token) {
  localStorage.setItem(CLAVE_TOKEN, token)
}

export function obtenerToken() {
  return localStorage.getItem(CLAVE_TOKEN)
}

export function borrarToken() {
  localStorage.removeItem(CLAVE_TOKEN)
}

/** Decodifica el payload de un JWT sin verificar la firma — solo para uso
 * de interfaz (mostrar el rol); el backend siempre vuelve a validar el
 * token y el rol en cada petición. */
export function decodificarToken(token) {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function usuarioActualDesdeToken() {
  const token = obtenerToken()
  if (!token) return null
  const payload = decodificarToken(token)
  if (!payload) return null
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    borrarToken()
    return null
  }
  // `nombre` no viene en tokens emitidos antes de este cambio; la interfaz cae al rol.
  return { id: Number(payload.sub), rol: payload.rol, nombre: payload.nombre || null }
}
