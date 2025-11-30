import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutoML } from '../context/AutoMLContext';
import client from '../api/client';
import { UploadCloud, FileText, AlertCircle, Loader } from 'lucide-react';
import './UploadPage.css';

const UploadPage = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const { setFileUrl, setMetadata } = useAutoML();
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setError(null);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await client.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.status === 'success') {
                setFileUrl(response.data.data.fileUrl);
                setMetadata(response.data.data.metadata);
                navigate('/preview');
            } else {
                setError(response.data.message || "Upload failed");
            }
        } catch (err) {
            console.error("Upload error:", err);
            setError(err.response?.data?.error || "Failed to upload file. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <h1>Upload Dataset</h1>
                <p>Start by uploading your CSV dataset for analysis.</p>
            </header>

            <div className="upload-card card">
                <form onSubmit={handleUpload} className="upload-form">
                    <label className="file-drop-area">
                        <UploadCloud size={64} className="text-primary" />
                        <h3> Click to Upload</h3>
                        <p className="text-secondary">Supported formats: CSV</p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="file-input"
                            style={{ display: 'none' }}
                        />
                    </label>

                    {file && (
                        <div className="file-info">
                            <FileText size={24} />
                            <span>{file.name}</span>
                            <span className="file-size">({(file.size / 1024).toFixed(2)} KB)</span>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={!file || uploading}
                    >
                        {uploading ? <Loader className="spinner" size={20} /> : 'Upload & Analyze'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UploadPage;
