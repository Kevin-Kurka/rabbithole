import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Home } from './pages/home';
import { ArticlePage } from './pages/article';
import { WritePage } from './pages/write';
import { ChallengePage } from './pages/challenge';
import { TheoryPage } from './pages/theory';
import { ExplorePage } from './pages/explore';
import { ProfilePage } from './pages/profile';
import { LoginPage } from './pages/login';
import { RegisterPage } from './pages/register';
import { NotificationsPage } from './pages/notifications';
import { AuthProvider, useAuth } from './lib/auth-context';
import { ErrorBoundary } from './components/error-boundary';

function NavBar() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return null;
  }

  return (
    <>
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center text-2xl font-bold text-rabbit-600 flex-shrink-0">
              🕳️ Rabbithole
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-gray-600 hover:text-rabbit-600 transition">Feed</Link>
              {isAuthenticated && (
                <>
                  <Link to="/write" className="text-gray-600 hover:text-rabbit-600 transition">Write</Link>
                  <Link to="/notifications" className="text-gray-600 hover:text-rabbit-600 transition">Notifications</Link>
                </>
              )}
              <Link to="/explore" className="text-gray-600 hover:text-rabbit-600 transition">Explore</Link>

              {isAuthenticated ? (
                <>
                  <Link to="/profile" className="text-gray-600 hover:text-rabbit-600 transition">Profile</Link>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100 transition"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 hover:text-rabbit-600 transition">Login</Link>
                  <Link to="/register" className="px-4 py-2 rounded-md bg-rabbit-600 text-white hover:bg-rabbit-700 transition">
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <Link to="/" className="block px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100">
                Feed
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/write" className="block px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100">
                    Write
                  </Link>
                  <Link to="/notifications" className="block px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100">
                    Notifications
                  </Link>
                </>
              )}
              <Link to="/explore" className="block px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100">
                Explore
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/profile" className="block px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100">
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100">
                    Login
                  </Link>
                  <Link to="/register" className="block px-3 py-2 rounded-md bg-rabbit-600 text-white hover:bg-rabbit-700">
                    Register
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

function ProtectedRoute({ element }: { element: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }

  return isAuthenticated ? element : <Navigate to="/login" />;
}

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/article/:id" element={<ArticlePage />} />
          <Route path="/write" element={<ProtectedRoute element={<WritePage />} />} />
          <Route path="/challenge/:id" element={<ChallengePage />} />
          <Route path="/theory/new" element={<ProtectedRoute element={<TheoryPage />} />} />
          <Route path="/theory/:id" element={<TheoryPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/profile" element={<ProtectedRoute element={<ProfilePage />} />} />
          <Route path="/notifications" element={<ProtectedRoute element={<NotificationsPage />} />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <p className="text-gray-600 text-sm">
              Built on{' '}
              <a href="https://sentient.sh" target="_blank" rel="noopener noreferrer" className="text-rabbit-600 hover:text-rabbit-700 font-medium">
                Sentient BaaS
              </a>
            </p>
            <p className="text-gray-400 text-xs mt-4 sm:mt-0">
              Rabbithole MVP 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
