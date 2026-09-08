import { useState } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import Bitacora from './pages/Bitacora.jsx'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'bitacora', label: 'Bitácora de obra' },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-obra-700 text-white px-6 py-4">
        <h1 className="text-lg font-semibold">Emanuel Ingeniería y Construcciones — Ejecución de Obras</h1>
      </header>

      <nav className="flex gap-2 px-6 pt-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-t-md text-sm font-medium ${
              tab === t.key
                ? 'bg-white text-obra-700 border border-b-0 border-gray-200'
                : 'text-gray-500 hover:text-obra-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="bg-white border-t border-gray-200 p-6">
        {tab === 'dashboard' ? <Dashboard /> : <Bitacora />}
      </main>
    </div>
  )
}
