import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PlayerPage from './pages/PlayerPage';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <Router>
      <div className="min-h-screen selection:bg-youtube-red selection:text-white flex flex-col">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/room/:roomId" element={<PlayerPage />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </Router>
  );
}

export default App;
