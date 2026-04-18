import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import AIChatWidget from '../ui/AIChatWidget'

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <AIChatWidget />
    </div>
  )
}