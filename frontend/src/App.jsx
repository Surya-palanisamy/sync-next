"use client"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx"
import { SocketProvider } from "./contexts/SocketContext.jsx"
import Login from "./components/Auth/Login.jsx"
import Register from "./components/Auth/Register.jsx"
import Dashboard from "./components/Dashboard/Dashboard.jsx"
import Tasks from "./components/Tasks/Tasks.jsx"
import Calendar from "./components/Calendar/Calendar.jsx"
import Chat from "./components/Chat/Chat.jsx"
import Notes from "./components/Notes/Notes.jsx"
import Layout from "./components/Layout/Layout.jsx"

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return user ? <Navigate to="/dashboard" /> : children
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster position="top-right" />
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <SocketProvider>
                    <Layout>
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/notes" element={<Notes />} />
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                      </Routes>
                    </Layout>
                  </SocketProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
