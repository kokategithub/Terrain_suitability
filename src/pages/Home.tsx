import { motion } from 'framer-motion'
import Hero from '../components/Hero'
import IntroSection from '../components/IntroSection'
import Footer from '../components/Footer'

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ minHeight: '100vh' }}
    >
      {/* Full-screen hero with rotating images */}
      <Hero />

      {/* Introduction, Problem, Solution, Model info */}
      <IntroSection />

      <Footer />
    </motion.div>
  )
}
