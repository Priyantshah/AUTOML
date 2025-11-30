import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutoML } from '../context/AutoMLContext';
import client from '../api/client';
import { ArrowRight, AlertCircle, Loader, CheckCircle } from 'lucide-react';
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
            <div className="imputation-section">
                <div className="imputation-header">
                    <h3>Handle Missing Values</h3>
                    <p>Automatically detect and fill missing values across all columns using smart strategies (Median for numeric, Mode for categorical).</p>
                </div>

                <div className="imputation-controls">
                    <button
                        className="btn btn-primary"
                        onClick={handleImpute}
                        disabled={imputeLoading}
                    >
                        {imputeLoading ? <Loader className="spinner" size={18} /> : 'Auto-Fill All Missing Values'}
                    </button>

                    {imputeMessage && (
                        <div className={`imputation-message ${imputeMessage.type}`}>
                            {imputeMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                            {imputeMessage.text}
                        </div>
                    )}
                </div>
            </div>

            <div className="table-container">
                {rows.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                {columns.map((col) => {
                                    const missingCount = metadata?.missingCounts?.[col] || 0;
                                    return (
                                        <th key={col}>
                                            {col}
                                            {missingCount > 0 && (
                                                <span className="missing-badge">
                                                    {missingCount} missing
                                                </span>
                                            )}
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
                                                className={isImputed ? 'imputed-cell' : ''}
                                                title={row[col]} // Show full content on hover
                                            >
                                                {row[col]}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <p>No preview data available.</p>
                    </div>
                )}
            </div>

            {rows.length > 0 && (
                <div className="table-footer">
                    <p>Showing first <strong>{rows.length}</strong> rows of <strong>{metadata?.rowCount || 'unknown'}</strong> total rows.</p>
                </div>
            )}

            <div className="actions right">
                <button className="btn btn-primary" onClick={() => navigate('/eda')}>
                    Proceed to EDA <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default PreviewPage;
