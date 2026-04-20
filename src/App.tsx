import { Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/home';
import { ArticlePage } from './pages/article';
import { WritePage } from './pages/write';
import { ChallengePage } from './pages/challenge';
import { TheoryPage } from './pages/theory';
import { ExplorePage } from './pages/explore';
import { ProfilePage } from './pages/profile';

export default function App() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-rabbit-600">
            🕳️ Rabbithole
          </Link>
          <div className="flex gap-6">
            <Link to="/" className="text-gray-600 hover:text-rabbit-600">Feed</Link>
            <Link to="/write" className="text-gray-600 hover:text-rabbit-600">Write</Link>
            <Link to="/explore" className="text-gray-600 hover:text-rabbit-600">Explore</Link>
            <Link to="/profile" className="text-gray-600 hover:text-rabbit-600">Profile</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/article/:id" element={<ArticlePage />} />
          <Route path="/write" element={<WritePage />} />
          <Route path="/challenge/:id" element={<ChallengePage />} />
          <Route path="/theory/:id" element={<TheoryPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  );
}
