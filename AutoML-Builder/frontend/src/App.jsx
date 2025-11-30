import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import UploadPage from './pages/UploadPage';
import PreviewPage from './pages/PreviewPage';
import EDAPage from './pages/EDAPage';
import TrainPage from './pages/TrainPage';
import ResultsPage from './pages/ResultsPage';
import PredictPage from './pages/PredictPage';
import { AutoMLProvider } from './context/AutoMLContext';
import './App.css';

function App() {
  return (
    <AutoMLProvider>
      <Router>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/upload" replace />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="preview" element={<PreviewPage />} />
            <Route path="eda" element={<EDAPage />} />
            <Route path="train" element={<TrainPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="predict" element={<PredictPage />} />
            <Route path="*" element={<div className="p-6">Page under construction</div>} />
          </Route>
        </Routes>
      </Router>
    </AutoMLProvider>
  );
}

export default App;
