import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';

// Temporary placeholder for the Login page so the app doesn't crash
// We will build the real one in the next step.
function LoginPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', background: '#FAF9F6' }}>
      <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h1 style={{ color: '#30434A', marginBottom: '10px' }}>Patient Login</h1>
        <p style={{ color: '#647a82' }}>Coming in the next step...</p>
        <a href="/" style={{ color: '#7A9E8B', fontWeight: 'bold', textDecoration: 'none' }}>&larr; Back to Landing Page</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Landing page is the root of the app */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Catch-all: redirect back to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}