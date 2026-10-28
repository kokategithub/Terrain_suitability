import { motion } from 'framer-motion'
import PredictionDashboard from '../components/PredictionDashboard'
import FactorCards from '../components/FactorCards'
import Footer from '../components/Footer'

export default function Predict() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ background: '#f3f4f6', minHeight: '100vh' }}
    >
      {/* Page header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2d1a 0%, #14532d 100%)',
        padding: '40px 24px 60px',
        textAlign: 'center',
      }}>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 800,
            fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
            color: '#ffffff', margin: '0 0 10px',
          }}
        >
          🔍 Predict Suitability
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            fontFamily: 'Inter, sans-serif', fontSize: 14,
            color: 'rgba(255,255,255,0.7)', margin: 0,
          }}
        >
          Enter coordinates or search a place to get the eco-tourism suitability prediction
        </motion.p>
      </div>

      {/* Prediction tool */}
      <PredictionDashboard />
      <FactorCards />
      <Footer />
    </motion.div>
  )
}
