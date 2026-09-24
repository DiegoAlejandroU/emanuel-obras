import { useEffect } from 'react'

/**
 * Modal de confirmación reutilizable — reemplaza a `window.confirm()` para
 * que las acciones destructivas (eliminar obra, actividad, etc.) se vean
 * consistentes con el resto de la interfaz en vez de la ventana nativa del
 * navegador.
 *
 * Uso: mantener en el componente padre un estado `{ titulo, mensaje,
 * onConfirmar }` (o `null` si está cerrado) y renderizar
 * `<ConfirmDialog abierto={...} ... />` una sola vez al final del árbol.
 */
export default function ConfirmDialog({
  abierto,
  titulo = 'Confirmar',
  mensaje,
  textoConfirmar = 'Eliminar',
  textoCancelar = 'Cancelar',
  onConfirmar,
  onCancelar,
}) {
  useEffect(() => {
    if (!abierto) return
    function alTeclear(e) {
      if (e.key === 'Escape') onCancelar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierto, onCancelar])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onCancelar}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{titulo}</h3>
        <p className="text-sm text-gray-600 mb-6">{mensaje}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100"
            onClick={onCancelar}
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirmar}
            autoFocus
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
