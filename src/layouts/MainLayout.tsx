import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function MainLayout() {
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <Navbar darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)} />
      <Outlet />
    </div>
  )
}
