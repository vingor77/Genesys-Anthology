import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ManageAccount from './pages/ManageAccount'
import CreateSession from './pages/CreateSession'
import JoinSession from './pages/JoinSession'
import SessionPage from './pages/SessionPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Landing />} />
            <Route path="/manage" element={<ManageAccount />} />
            <Route path="/sessions/new" element={<CreateSession />} />
            <Route path="/join" element={<JoinSession />} />
            <Route path="/join/:code" element={<JoinSession />} />
            <Route path="/sessions/:sessionId" element={<SessionPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App