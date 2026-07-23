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
import MySessions from './pages/MySessions'
import NotFound from './pages/NotFound'
import DeleteAccount from './pages/DeleteAccount'
import CreateCharacter from './pages/CreateCharacter'
import CharacterSheet from './pages/CharacterSheet'
import PlayPage from './pages/PlayPage'
import AdminSeedPage from './seed/AdminSeedPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/*" element={<NotFound />} />
          <Route path="admin-seed" element={<AdminSeedPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/manage" element={<ManageAccount />} />
              <Route path="/sessions/new" element={<CreateSession />} />
              <Route path="/sessions/:sessionId" element={<SessionPage />} />
              <Route path="/join" element={<JoinSession />} />
              <Route path="/join/:code" element={<JoinSession />} />
              <Route path="/sessions" element={<MySessions />} />
              <Route path="/delete-account" element={<DeleteAccount />} />
              <Route path="/sessions/:sessionId/characters/new" element={<CreateCharacter />} />
              <Route path="/characters/:characterId" element={<CharacterSheet />} />
              <Route path="/characters/:characterId/play" element={<PlayPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App