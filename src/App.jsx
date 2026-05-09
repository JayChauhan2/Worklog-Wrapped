import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

function Home() {
  return (
    <div className="bucket-wrapper">
      <svg 
        className="bucket" 
        width="120" 
        height="120" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="#1f1f1f" 
        strokeWidth="0.6" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {/* An empty bucket shape (U shape with an elliptical top rim) */}
        <path d="M4.5 4.5l1.5 15A2 2 0 0 0 8 21.5h8a2 2 0 0 0 2-2l1.5-15" />
        <ellipse cx="12" cy="4.5" rx="7.5" ry="2" />
      </svg>

      <svg 
        className="arrow-container" 
        width="160" 
        height="160" 
        viewBox="0 0 160 160"
      >
        <path 
          className="arrow-line" 
          d="M 140 10 Q 100 10 20 90" 
          fill="none" 
          stroke="#1f1f1f" 
          strokeWidth="3" 
          strokeLinecap="round" 
        />
        <polygon 
          className="arrow-head" 
          points="20,90 35.6,84.4 25.6,74.4" 
          fill="#1f1f1f" 
        />
      </svg>
    </div>
  );
}

function Gallery() {
  // Completely blank page as requested
  return null;
}

function App() {
  return (
    <Router>
      <div className="canvas">
        <nav className="navbar">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/gallery" className="nav-link">Gallery</Link>
        </nav>
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
