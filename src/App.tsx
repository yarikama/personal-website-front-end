import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import ScrollProgress from './components/ui/ScrollProgress'
import CursorFollower from './components/ui/CursorFollower'
import AskProvider from './components/ask/AskProvider'
import AskWidget from './components/ask/AskWidget'
import SelectionAsk from './components/ask/SelectionAsk'
import ProtectedRoute from './components/admin/ProtectedRoute'
import Home from './pages/Home'
import WorksPage from './pages/WorksPage'
import NotesPage from './pages/NotesPage'

// Split out routes that pull in markdown/KaTeX or the admin editors, so the
// home page does not download them. Import files directly, not through the
// barrels, or the barrel's static re-exports pull them back into the main chunk.
const NotePage = lazy(() => import('./pages/NotePage'))
const AdminLogin = lazy(() => import('./pages/admin/Login'))
const AdminHome = lazy(() => import('./pages/admin/Home'))
const AdminNotesList = lazy(() => import('./pages/admin/NotesList'))
const AdminNoteEditor = lazy(() => import('./pages/admin/NoteEditor'))
const AdminProjectsList = lazy(() => import('./pages/admin/ProjectsList'))
const AdminProjectEditor = lazy(() => import('./pages/admin/ProjectEditor'))
const AdminCategoriesList = lazy(() => import('./pages/admin/CategoriesList'))
const AdminCategoryEditor = lazy(() => import('./pages/admin/CategoryEditor'))
const AdminQuestionsList = lazy(() => import('./pages/admin/QuestionsList'))
const AdminMessagesList = lazy(() => import('./pages/admin/MessagesList'))
const AdminVisitors = lazy(() => import('./pages/admin/Visitors'))
const Talk = lazy(() => import('./pages/Talk'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {/* The interview talk - full-screen slides, no header/footer */}
          <Route path="/talk" element={<Talk />} />
          <Route path="/talk/presenter" element={<Talk presenter />} />

          {/* Admin routes - no header/footer */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notes"
            element={
              <ProtectedRoute>
                <AdminNotesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notes/new"
            element={
              <ProtectedRoute>
                <AdminNoteEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notes/:id/edit"
            element={
              <ProtectedRoute>
                <AdminNoteEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/projects"
            element={
              <ProtectedRoute>
                <AdminProjectsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/projects/new"
            element={
              <ProtectedRoute>
                <AdminProjectEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/projects/:id/edit"
            element={
              <ProtectedRoute>
                <AdminProjectEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute>
                <AdminCategoriesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories/new"
            element={
              <ProtectedRoute>
                <AdminCategoryEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories/:id/edit"
            element={
              <ProtectedRoute>
                <AdminCategoryEditor />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/questions"
            element={
              <ProtectedRoute>
                <AdminQuestionsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/messages"
            element={
              <ProtectedRoute>
                <AdminMessagesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/visitors"
            element={
              <ProtectedRoute>
                <AdminVisitors />
              </ProtectedRoute>
            }
          />

          {/* Public routes - with header/footer */}
          <Route
            path="*"
            element={
              // One ask conversation for every public page: the home page
              // section and the floating chat share it.
              <AskProvider>
                <div className="min-h-dvh bg-paper text-ink">
                  <CursorFollower />
                  <ScrollProgress />
                  <Header />
                  <main className="pb-24">
                    <Suspense fallback={<div className="min-h-dvh" />}>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/works" element={<WorksPage />} />
                        {/* The old name, still in links elsewhere */}
                        <Route path="/archive" element={<Navigate to="/works" replace />} />
                        <Route path="/notes" element={<NotesPage />} />
                        <Route path="/notes/:slug" element={<NotePage />} />
                      </Routes>
                    </Suspense>
                  </main>
                  <Footer />
                  <AskWidget />
                  <SelectionAsk />
                </div>
              </AskProvider>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
