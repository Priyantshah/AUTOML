import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutoML } from '../context/AutoMLContext';
import client from '../api/client';
import { ArrowRight, AlertCircle, Loader, Zap } from 'lucide-react';
import './PredictPage.css';

const PredictPage = () => {
    const { metadata, modelUrl, targetColumn, edaResults } = useAutoML();
    const [formData, setFormData] = useState({});
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [relevantFeatures, setRelevantFeatures] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (!modelUrl) {
            navigate('/train');
        }

        // Determine feature order based on EDA correlation data
        let features = metadata?.columns?.filter(col => col !== targetColumn) || [];

        if (edaResults && edaResults.correlation && targetColumn) {
            const targetCorrelations = edaResults.correlation[targetColumn];
            if (targetCorrelations) {
                // Sort features by correlation strength (descending)
                features.sort((a, b) => {
                    const corrA = Math.abs(targetCorrelations[a] || 0);
                    const corrB = Math.abs(targetCorrelations[b] || 0);
                    return corrB - corrA;
                });
            }
        }

        setRelevantFeatures(features);

        // Initialize form data with all features
        if (features.length > 0) {
            const initialData = {};
            features.forEach(col => {
                initialData[col] = '';
            });
            setFormData(initialData);
        }
    }, [modelUrl, metadata, targetColumn, edaResults, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePredict = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setPrediction(null);

        try {
            // Convert numeric inputs
            const processedData = { ...formData };
            Object.keys(processedData).forEach(key => {
                if (!isNaN(processedData[key]) && processedData[key] !== '') {
                    processedData[key] = Number(processedData[key]);
                }
            });

            const response = await client.post('/predict', {
                modelUrl,
                inputData: [processedData] // Backend expects list of dicts
            });
            setPrediction(response.data.data);
        } catch (err) {
            console.error("Prediction failed:", err);
            setError(err.response?.data?.error || err.message || "Prediction failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <h1>Make Predictions</h1>
                <p>Use your trained model to predict new values.</p>
                {edaResults?.correlation?.[targetColumn] && (
                    <p style={{ fontSize: '0.9rem', color: '#10b981', marginTop: '0.5rem' }}>
                        ✨ Features are sorted by importance based on correlation analysis
                    </p>
                )}
            </header>

            <div className="predict-layout">
                {/* Input Form */}
                <div className="form-card">
                    <h3>Input Features</h3>

                    <form onSubmit={handlePredict}>
                        <div className="form-grid">
                            {relevantFeatures.map((col, idx) => (
                                <div key={col} className="form-group">
                                    <label htmlFor={col}>
                                        {col}
                                        {edaResults?.correlation?.[targetColumn]?.[col] && (
                                            <span className="corr-badge">
                                                corr: {Math.abs(edaResults.correlation[targetColumn][col]).toFixed(2)}
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        id={col}
                                        name={col}
                                        value={formData[col] || ''}
                                        onChange={handleInputChange}
                                        placeholder={`Enter ${col}`}
                                        required
                                    />
                                </div>
                            ))}
                        </div>

                        <button type="submit" className="btn btn-primary btn-block mt-4" disabled={loading}>
                            {loading ? <Loader className="spinner" size={20} /> : <Zap size={20} />}
                            {loading ? 'Predicting...' : 'Predict Value'}
                        </button>
                    </form>
                </div>

                {/* Result Card */}
                <div className="result-section">
                    {error && (
                        <div className="error-message">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}

                    {prediction && (
                        <div className="prediction-card animate-fade-in">
                            <h3>Prediction Result</h3>
                            <div className="prediction-value">
                                {prediction.prediction[0]}
                            </div>
                            <p className="prediction-meta">
                                Task Type: {prediction.task_type}
                            </p>
                            <button className="btn btn-secondary btn-sm" onClick={() => setPrediction(null)}>
                                Clear Result
                            </button>
                        </div>
                    )}

                    {!prediction && !error && (
                        <div className="placeholder-card">
                            <Zap size={48} className="text-secondary" />
                            <p>Enter values and click predict to see results here.</p>
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
};

export default PredictPage;
