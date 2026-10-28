import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
<<<<<<< HEAD
import Predict from './pages/Predict'
=======
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
import About from './pages/About'
import Contact from './pages/Contact'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/"        element={<Home />} />
<<<<<<< HEAD
        <Route path="/predict" element={<Predict />} />
        <Route path="/map"     element={<Predict />} />
=======
        <Route path="/predict" element={<Home />} />
        <Route path="/map"     element={<Home />} />
>>>>>>> ce5cb1dca9cacff24ac2b0af49eb27a9bd8b0f56
        <Route path="/about"   element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
    </Routes>
  )
}
