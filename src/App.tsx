import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ManageAccount from './pages/ManageAccount'
import CreateSession from './pages/CreateSession'
import JoinSession from './pages/JoinSession'
import SessionPage from './pages/SessionPage'
import MySessions from './pages/Mysessions'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/manage" element={<ManageAccount />} />
              <Route path="/sessions/new" element={<CreateSession />} />
              <Route path="/sessions/:sessionId" element={<SessionPage />} />
              <Route path="/join" element={<JoinSession />} />
              <Route path="/join/:code" element={<JoinSession />} />
              <Route path="/sessions" element={<MySessions />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App