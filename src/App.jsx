import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PlayerPage from './pages/PlayerPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen selection:bg-youtube-red selection:text-white flex flex-col">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/player" element={<PlayerPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
