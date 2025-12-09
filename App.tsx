import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Detail } from './pages/Detail';
import { Settings } from './pages/Settings';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8F5E6]">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/article/:id" element={<Detail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;