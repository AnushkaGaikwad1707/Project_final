import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import Overview from './pages/Overview';
import Analyze from './pages/Analyze';
import ComponentDetail from './pages/ComponentDetail';
import Components from './pages/Components';
import Data from './pages/Data';
import Models from './pages/Models';
import System from './pages/System';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/analyze/:componentId" element={<ComponentDetail />} />
            <Route path="/components" element={<Components />} />
            <Route path="/data" element={<Data />} />
            <Route path="/models" element={<Models />} />
            <Route path="/system" element={<System />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
