import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutoML } from '../context/AutoMLContext';
import client from '../api/client';
import { ArrowRight, AlertCircle, Loader } from 'lucide-react';
import './PreviewPage.css';

const PreviewPage = () => {
    const { fileUrl, setFileUrl, metadata, setMetadata } = useAutoML();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Imputation State
    const [imputeLoading, setImputeLoading] = useState(false);
    const [imputeMessage, setImputeMessage] = useState(null);
    // Track indices of imputed rows per column: { "colName": [indices...] }
    const [imputedIndicesMap, setImputedIndicesMap] = useState({});

    useEffect(() => {
        if (!fileUrl) {
            navigate('/upload');
            return;
        }

        // Reset state when file changes
        setImputedIndicesMap({});
        setImputeMessage(null);

        const fetchPreview = async () => {
            try {
                // If metadata already has preview, use it. Otherwise fetch.
                if (metadata && metadata.preview && metadata.preview.length > 0) {
                    setLoading(false);
                    return;
                }

                const response = await client.post('/preview', { fileUrl });
                setMetadata(response.data.data);
            } catch (err) {
                console.error("Preview fetch failed:", err);
                setError("Failed to load data preview.");
            } finally {
                setLoading(false);
            }
        };

        fetchPreview();
    }, [fileUrl, navigate, metadata, setMetadata]);

    const handleImpute = async () => {
        setImputeLoading(true);
        setImputeMessage(null);

        try {
            const response = await client.post('/impute', {
                fileUrl,
                column: 'ALL'
            });

            if (response.data.status === 'success') {
                const strategyUsed = response.data.data.strategy_used || 'auto';
                setImputeMessage({
                    type: 'success',
                    text: response.data.data.message
                });

                // Update cumulative imputed indices
                if (response.data.data.imputed_indices) {
                    const newIndices = response.data.data.imputed_indices;
                    setImputedIndicesMap(prev => {
                        const updatedMap = { ...prev };

                        if (Array.isArray(newIndices)) {
                            // Single column case
                            if (response.data.data.details && response.data.data.details.length === 1) {
                                const col = response.data.data.details[0].column;
                                updatedMap[col] = newIndices;
                            }
                        } else {
                            // Multiple columns case (dict)
                            Object.entries(newIndices).forEach(([col, indices]) => {
                                updatedMap[col] = indices;
                            });
                        }
                        return updatedMap;
                    });
                }

                // Update fileUrl with timestamp to bust cache
                const cleanUrl = fileUrl.split('?')[0];
                const newUrl = `${cleanUrl}?t=${Date.now()}`;
                setFileUrl(newUrl);

                // Refresh preview with new URL
                const previewResponse = await client.post('/preview', { fileUrl: newUrl });
                setMetadata(previewResponse.data.data);
            } else {
                setImputeMessage({ type: 'error', text: response.data.data.error || "Imputation failed" });
            }
        } catch (err) {
            console.error("Imputation failed:", err);
            setImputeMessage({ type: 'error', text: err.response?.data?.error || "Imputation failed" });
        } finally {
            setImputeLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container flex-center">
                <Loader className="spinner" size={48} />
                <p>Loading dataset preview...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container flex-center">
                <AlertCircle size={48} className="text-error" />
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => navigate('/upload')}>Go Back</button>
            </div>
        );
    }

    const columns = metadata?.columns || [];
    const rows = metadata?.preview || [];

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <h1>Data Preview</h1>
                <p>Review your dataset before analysis.</p>
            </header>

            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Rows</h3>
                    <p>{metadata?.rowCount}</p>
                </div>
                <div className="stat-card">
                    <h3>Columns</h3>
                    <p>{metadata?.columnCount}</p>
                </div>
            </div>

            {/* Imputation Section */}
            <div className="imputation-section" style={{ background: '#1e1e1e', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #333' }}>
                <h3 style={{ marginBottom: '0.5rem', color: '#fff' }}>Handle Missing Values</h3>
                <p style={{ marginBottom: '1rem', color: '#888', fontSize: '0.9rem' }}>
                    Automatically detect and fill missing values across all columns using smart strategies (Median for numeric, Mode for categorical).
                </p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleImpute}
                        disabled={imputeLoading}
                        style={{ height: '42px', minWidth: '200px' }}
                    >
                        {imputeLoading ? 'Processing...' : 'Auto-Fill All Missing Values'}
                    </button>

                    {imputeMessage && (
                        <div style={{ padding: '0.5rem 1rem', borderRadius: '4px', background: imputeMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: imputeMessage.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${imputeMessage.type === 'success' ? '#10b981' : '#ef4444'}` }}>
                            {imputeMessage.text}
                        </div>
                    )}
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map((col) => {
                                const missingCount = metadata?.missingCounts?.[col] || 0;
                                return (
                                    <th key={col}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {col}
                                            {missingCount > 0 && (
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    padding: '2px 6px',
                                                    borderRadius: '10px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {missingCount} missing
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx}>
                                {columns.map((col) => {
                                    // Check if this cell was imputed
                                    const isImputed = imputedIndicesMap[col] && imputedIndicesMap[col].includes(idx);
                                    return (
                                        <td
                                            key={`${idx}-${col}`}
                                            style={isImputed ? { backgroundColor: 'rgba(255, 193, 7, 0.2)', border: '1px solid #ffc107', color: '#ffc107', fontWeight: 'bold' } : {}}
                                        >
                                            {row[col]}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="actions right">
                <button className="btn btn-primary" onClick={() => navigate('/eda')}>
                    Proceed to EDA <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default PreviewPage;
