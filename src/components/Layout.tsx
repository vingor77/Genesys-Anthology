import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-page text-fg">
      <Navbar />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}