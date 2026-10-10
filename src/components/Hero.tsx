import { motion } from 'framer-motion'
import { GiLeafSwirl } from 'react-icons/gi'
import { MdTerrain } from 'react-icons/md'
import { WiCloud } from 'react-icons/wi'
import { RiBrainLine } from 'react-icons/ri'

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
        >
          {features.map((f, i) => (
            <motion.div
              key={f.id}
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
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
