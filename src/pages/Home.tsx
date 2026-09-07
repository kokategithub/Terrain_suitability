import { motion } from 'framer-motion'
import Hero from '../components/Hero'
import PredictionDashboard from '../components/PredictionDashboard'
import FactorCards from '../components/FactorCards'
import Footer from '../components/Footer'

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ background: '#f3f4f6', minHeight: '100vh' }}
    >
      <Hero />
      <div style={{ paddingBottom: 8 }}>
        <PredictionDashboard />
        <FactorCards />
      </div>
      <Footer />
    </motion.div>
  )
}
