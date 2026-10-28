<<<<<<< HEAD
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
=======
import { motion } from 'framer-motion'
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
import { GiLeafSwirl } from 'react-icons/gi'
import { MdTerrain } from 'react-icons/md'
import { WiCloud } from 'react-icons/wi'
import { RiBrainLine } from 'react-icons/ri'
<<<<<<< HEAD
import { FiChevronDown } from 'react-icons/fi'

// Beautiful nature/greenery region images from Unsplash
const heroImages = [
  {
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=90',
    label: 'Dense Forest',
    location: 'Western Ghats, India',
  },
  {
    url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=90',
    label: 'Mountain Valleys',
    location: 'Himachal Pradesh, India',
  },
  {
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=90',
    label: 'Hill Stations',
    location: 'Maharashtra, India',
  },
  {
    url: 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=1920&q=90',
    label: 'Wildlife Reserves',
    location: 'Central India',
  },
  {
    url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=90',
    label: 'River Valleys',
    location: 'Northeast India',
  },
]

const features = [
  { id: 'env',     icon: <GiLeafSwirl size={22} />, label: 'Environment\nAnalysis' },
  { id: 'terrain', icon: <MdTerrain size={22} />,   label: 'Terrain\nMapping' },
  { id: 'weather', icon: <WiCloud size={28} />,     label: 'Weather\nData' },
  { id: 'ai',      icon: <RiBrainLine size={22} />, label: 'Deep Learning\nModel' },
]

export default function Hero() {
  const [current, setCurrent] = useState(0)

  // Auto-rotate images every 4 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setCurrent(prev => (prev + 1) % heroImages.length)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  const navigate = useNavigate()

  const scrollToPredict = () => navigate('/predict')

  return (
    <section style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', minHeight: 600 }}>

      {/* ── Rotating background images ── */}
      <AnimatePresence mode="sync">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url('${heroImages[current].url}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </AnimatePresence>

      {/* ── Dark gradient overlay ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(5,18,10,0.55) 0%, rgba(5,18,10,0.72) 60%, rgba(5,18,10,0.92) 100%)',
      }} />

      {/* ── Image dots indicator ── */}
      <div style={{
        position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, zIndex: 10,
      }}>
        {heroImages.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: i === current ? 24 : 8, height: 8,
              borderRadius: 4, border: 'none', cursor: 'pointer',
              background: i === current ? '#22c55e' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.3s',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* ── Current location badge ── */}
      <motion.div
        key={`badge-${current}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          position: 'absolute', bottom: 100, right: 32, zIndex: 10,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(34,197,94,0.4)', borderRadius: 10,
          padding: '8px 14px',
        }}
      >
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#4ade80', fontWeight: 600, marginBottom: 2 }}>
          📍 {heroImages[current].label}
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
          {heroImages[current].location}
        </div>
      </motion.div>

      {/* ── Main content ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 24px', textAlign: 'center',
      }}>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 900,
            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
            color: '#ffffff', margin: '0 0 16px',
            lineHeight: 1.15, maxWidth: 800,
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          Terrain Suitability Mapping<br />
          <span style={{ color: '#4ade80' }}>for Eco-Tourism</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            fontFamily: 'Inter, sans-serif', fontSize: 16,
            color: 'rgba(255,255,255,0.80)', maxWidth: 580,
            lineHeight: 1.7, margin: '0 0 36px',
          }}
        >
          Using satellite imagery, deep learning, and real-time geospatial data
          to identify the best eco-tourism locations across India.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 48 }}
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 8px 28px rgba(34,197,94,0.5)' }}
            whileTap={{ scale: 0.96 }}
            onClick={scrollToPredict}
            style={{
              padding: '13px 28px', borderRadius: 12, border: 'none',
              background: '#22c55e', color: '#fff',
              fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15,
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
            }}
          >
            🔍 Try the Prediction Tool
          </motion.button>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}
=======

const features = [
  { id: 'env',    icon: <GiLeafSwirl size={26} />,  label: 'Environment\nFriendly' },
  { id: 'terrain',icon: <MdTerrain size={26} />,    label: 'Terrain\nAnalysis' },
  { id: 'weather',icon: <WiCloud size={32} />,      label: 'Weather\nData' },
  { id: 'ai',     icon: <RiBrainLine size={26} />,  label: 'Deep Learning\nModel' },
]

export default function Hero() {
  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        height: '420px',
        overflow: 'hidden',
      }}
    >
      {/* Background — bright green mountain valley matching reference */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url('https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&q=85')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 55%',
        }}
      />

      {/* Gradient overlay: dark left, transparent right to reveal mountains */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to right, rgba(5,18,10,0.88) 0%, rgba(5,18,10,0.72) 35%, rgba(5,18,10,0.40) 60%, rgba(5,18,10,0.15) 100%)',
        }}
      />

      {/* Content row */}
      <div
        style={{
          position: 'relative',
          height: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
        }}
      >
        {/* LEFT: headline + description */}
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          style={{ maxWidth: 400 }}
        >
          <h1
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              fontSize: '2.25rem',
              lineHeight: 1.18,
              color: '#ffffff',
              margin: '0 0 14px 0',
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            AI Powered Ecotourism
            <br />
            Suitability Prediction
          </h1>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              lineHeight: 1.65,
              color: 'rgba(255,255,255,0.78)',
              margin: 0,
            }}
          >
            Enter any location to check its suitability for ecotourism
            using deep learning and geospatial analysis.
          </p>
        </motion.div>

        {/* RIGHT: 4 circular feature icons */}
        <motion.div
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 28,
            flexShrink: 0,
          }}
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
        >
          {features.map((f, i) => (
            <motion.div
              key={f.id}
<<<<<<< HEAD
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.08 }}
              whileHover={{ y: -3 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(34,197,94,0.3)', borderRadius: 99,
                padding: '7px 14px', cursor: 'default',
              }}
            >
              <span style={{ color: '#4ade80' }}>{f.icon}</span>
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.9)',
                fontWeight: 500, whiteSpace: 'pre-line',
              }}>{f.label}</span>
=======
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.45 }}
              whileHover={{
                scale: 1.08,
                filter: 'drop-shadow(0 0 10px rgba(34,197,94,0.65))',
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: 'rgba(12,60,28,0.75)',
                  border: '2px solid rgba(34,197,94,0.65)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4ade80',
                }}
              >
                {f.icon}
              </div>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.9)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                  whiteSpace: 'pre-line',
                }}
              >
                {f.label}
              </span>
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
            </motion.div>
          ))}
        </motion.div>
      </div>
<<<<<<< HEAD

      {/* ── Scroll indicator ── */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        onClick={scrollToPredict}
        style={{
          position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}
      >
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>
          SCROLL DOWN
        </span>
        <FiChevronDown size={18} style={{ color: 'rgba(255,255,255,0.5)' }} />
      </motion.div>
=======
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
    </section>
  )
}
