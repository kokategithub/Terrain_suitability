import { motion } from 'framer-motion'
import Hero from '../components/Hero'
<<<<<<< HEAD
import IntroSection from '../components/IntroSection'
=======
import PredictionDashboard from '../components/PredictionDashboard'
import FactorCards from '../components/FactorCards'
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
import Footer from '../components/Footer'

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
<<<<<<< HEAD
      style={{ minHeight: '100vh' }}
    >
      {/* Full-screen hero with rotating images */}
      <Hero />

      {/* Introduction, Problem, Solution, Model info */}
      <IntroSection />

=======
      style={{ background: '#f3f4f6', minHeight: '100vh' }}
    >
      <Hero />
      <div style={{ paddingBottom: 8 }}>
        <PredictionDashboard />
        <FactorCards />
      </div>
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
      <Footer />
    </motion.div>
  )
}
