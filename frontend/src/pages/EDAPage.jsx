import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutoML } from '../context/AutoMLContext';
import client from '../api/client';
import { ArrowRight, BarChart2, Loader, AlertCircle } from 'lucide-react';
import './EDAPage.css';

const EDAPage = () => {
    const { fileUrl, setEdaResults, edaResults, metadata, setTargetColumn } = useAutoML();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedTarget, setSelectedTarget] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!fileUrl) {
            navigate('/upload');
        }
    }, [fileUrl, navigate]);

    const handleAnalyzeTarget = async () => {
        if (!selectedTarget) return;
        setLoading(true);
        setError(null);
        try {
            const response = await client.post('/eda', {
                fileUrl,
                targetColumn: selectedTarget
            });
            if (response.data.status === 'success') {
                setEdaResults(response.data.data);
            } else {
                setError("Failed to analyze target.");
            }
        } catch (err) {
            console.error("Target analysis error:", err);
            setError("Failed to analyze target.");
        } finally {
            setLoading(false);
        }
    };

    const handleProceed = () => {
        if (!selectedTarget) {
            alert("Please select a target column before proceeding.");
            return;
        }
        setTargetColumn(selectedTarget);
        navigate('/train');
    };

    if (error) {
        return (
            <div className="page-container flex-center">
                <AlertCircle size={48} className="text-error" />
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => setError(null)}>Try Again</button>
            </div>
        );
    }

    // Calculate stats if available
    const correlationData = edaResults?.correlation || {};
    const correlationKeys = Object.keys(correlationData);

    const getCorrelationColor = (value) => {
        if (value === null || value === undefined) return 'transparent';
        const absVal = Math.abs(value);
        return `rgba(100, 108, 255, ${absVal})`;
    };

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <h1>Exploratory Data Analysis</h1>
                <p>Select a target variable to generate insights.</p>
            </header>

            <div className="eda-grid">
                {/* Target Selection Card - Now First */}
                <div className="card highlight-card full-width">
                    <h3>Select Target Variable</h3>
                    <p className="text-sm mb-4">Choose the column you want to predict to start the analysis.</p>
                    <div className="form-group">
                        <select
                            value={selectedTarget}
                            onChange={(e) => setSelectedTarget(e.target.value)}
                            className="form-select"
                        >
                            <option value="">-- Select Target Column --</option>
                            {metadata?.columns?.map(col => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>
                        <button
                            className="btn btn-secondary full-width mt-2"
                            onClick={handleAnalyzeTarget}
                            disabled={!selectedTarget || loading}
                        >
                            {loading ? <Loader size={16} className="spinner" /> : <BarChart2 size={16} />}
                            {loading ? 'Analyzing...' : 'Start EDA'}
                        </button>
                    </div>
                </div>

                {/* Analysis Results - Only shown after analysis */}
                {edaResults && (
                    <>
                        {/* Target Analysis Results */}
                        {edaResults?.model_recommendation && (
                            <div className="card full-width animate-fade-in">
                                <h3>Target Analysis: <span className="text-primary">{selectedTarget || edaResults.target_analysis?.type}</span></h3>
                                <div className="target-type-badge">
                                    Target Type: <strong>{edaResults.target_analysis?.type}</strong>
                                </div>

                                <div className="analysis-grid">
                                    <div className="recommendation-box">
                                        <h4>Recommended Model</h4>
                                        <div className="recommendation-content">
                                            <span className="model-name">{edaResults.model_recommendation.model}</span>
                                            <p className="reason">{edaResults.model_recommendation.reason}</p>
                                        </div>
                                    </div>

                                    <div className="relationships-box">
                                        <h4>Key Relationships</h4>
                                        {edaResults.key_relationships?.length > 0 ? (
                                            <ul className="insights-list">
                                                {edaResults.key_relationships.map((insight, idx) => (
                                                    <li key={idx}>{insight}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-secondary">No strong relationships found.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Correlations */}
                        <div className="card full-width animate-fade-in">
                            <h3>Correlation Matrix</h3>
                            <div className="correlation-container">
                                {correlationKeys.length > 0 ? (
                                    <table className="data-table correlation-table">
                                        <thead>
                                            <tr>
                                                <th></th>
                                                {correlationKeys.map(key => (
                                                    <th key={key} title={key}>{key.length > 10 ? key.substring(0, 10) + '...' : key}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {correlationKeys.map(rowKey => (
                                                <tr key={rowKey}>
                                                    <td className="row-header" title={rowKey}>{rowKey.length > 15 ? rowKey.substring(0, 15) + '...' : rowKey}</td>
                                                    {correlationKeys.map(colKey => {
                                                        const val = correlationData[rowKey][colKey];
                                                        return (
                                                            <td
                                                                key={`${rowKey}-${colKey}`}
                                                                style={{
                                                                    backgroundColor: getCorrelationColor(val),
                                                                    color: Math.abs(val) > 0.5 ? 'white' : '#ccc'
                                                                }}
                                                                title={`${rowKey} vs ${colKey}: ${val}`}
                                                            >
                                                                {val !== null ? val.toFixed(2) : '-'}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-secondary">No numeric correlations available.</p>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="actions right mt-4">
                <button
                    className="btn btn-primary"
                    onClick={handleProceed}
                    disabled={!selectedTarget || !edaResults}
                >
                    Proceed to Training <ArrowRight size={20} />
                </button>
            </div>
        </div >
    );
};

export default EDAPage;
