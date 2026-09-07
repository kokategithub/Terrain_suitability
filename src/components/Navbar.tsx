import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiSun, FiMoon, FiMenu, FiX } from 'react-icons/fi'
import { FaInfoCircle } from 'react-icons/fa'
import { TbMountain } from 'react-icons/tb'

const navLinks = ['Home', 'Predict', 'Suitability Map', 'About', 'Contact']

interface NavbarProps {
  darkMode: boolean
  onToggleDark: () => void
}

export default function Navbar({ darkMode, onToggleDark }: NavbarProps) {
  const [active, setActive] = useState('Home')
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{
        background: '#0f2d1a',
        borderBottom: '1px solid rgba(34,197,94,0.1)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center justify-between h-[58px]">

          {/* ── Logo ── */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(34,197,94,0.15)',
                border: '1.5px solid #22c55e',
              }}
            >
              <TbMountain size={18} style={{ color: '#4ade80' }} />
            </div>
            <div style={{ lineHeight: 1.25 }}>
              <div
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '15px',
                  color: '#ffffff',
                }}
              >
                EcoTourism
              </div>
              <div
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '11px',
                  color: '#4ade80',
                }}
              >
                Suitability Prediction
              </div>
            </div>
          </div>

          {/* ── Nav links ── */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link}
                onClick={() => setActive(link)}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: '13.5px',
                  color: active === link ? '#22c55e' : 'rgba(255,255,255,0.8)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 14px',
                  position: 'relative',
                  transition: 'color 0.15s',
                }}
              >
                {link}
                {active === link && (
                  <motion.div
                    layoutId="underline"
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '55%',
                      height: 2,
                      background: '#22c55e',
                      borderRadius: 2,
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* ── Right side ── */}
          <div className="flex items-center gap-2">
            {/* Sun / Moon toggle */}
            <button
              onClick={onToggleDark}
              aria-label="Toggle theme"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 99,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
              }}
            >
              <FiSun
                size={13}
                style={{ color: darkMode ? 'rgba(255,255,255,0.25)' : '#fbbf24' }}
              />
              <FiMoon
                size={13}
                style={{ color: darkMode ? '#93c5fd' : 'rgba(255,255,255,0.25)' }}
              />
            </button>

            {/* About Project */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="hidden sm:flex items-center gap-1.5"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '13px',
                color: '#fff',
                background: '#22c55e',
                border: 'none',
                borderRadius: 99,
                padding: '7px 16px',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(34,197,94,0.4)',
              }}
            >
              <FaInfoCircle size={12} />
              About Project
            </motion.button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          style={{
            borderTop: '1px solid rgba(34,197,94,0.12)',
            padding: '8px 16px 12px',
          }}
        >
          {navLinks.map((link) => (
            <button
              key={link}
              onClick={() => { setActive(link); setMobileOpen(false) }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                padding: '9px 12px',
                borderRadius: 8,
                background: active === link ? 'rgba(34,197,94,0.1)' : 'none',
                color: active === link ? '#22c55e' : 'rgba(255,255,255,0.8)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {link}
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}
