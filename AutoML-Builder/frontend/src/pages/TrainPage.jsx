import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutoML } from '../context/AutoMLContext';
import client from '../api/client';
import { Play, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import './TrainPage.css';

const TrainPage = () => {
    const { fileUrl, targetColumn, setModelUrl, setTrainResults } = useAutoML();
    const [training, setTraining] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Redirect if no target selected
    React.useEffect(() => {
        if (!targetColumn) {
            navigate('/eda');
        }
    }, [targetColumn, navigate]);

    const handleTrain = async () => {
        if (!targetColumn) return;

        setTraining(true);
        setError(null);
        setProgress(0);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 5, 90));
            }, 1000);

            const response = await client.post('/train', {
                fileUrl,
                targetColumn
            });

            clearInterval(progressInterval);
            setProgress(100);

            if (response.data.status === 'success') {
                setTrainResults(response.data.data);
                setModelUrl(response.data.data.model_url || response.data.data.model_path);
                navigate('/results');
            } else {
                setError("Training failed.");
            }
        } catch (err) {
            console.error("Training error:", err);
            setError(err.response?.data?.error || "Training failed.");
        } finally {
            setTraining(false);
        }
    };

    if (!targetColumn) return null;

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <h1>Train Model</h1>
                <p>Training models to predict: <strong>{targetColumn}</strong></p>
            </header>

            <div className="train-layout">
                <div className="config-card card center-content">
                    <div className="training-status">
                        {training ? (
                            <div className="loader-container">
                                <Loader className="spinner text-primary" size={64} />
                                <h3>Training in Progress...</h3>
                                <div className="progress-bar-container">
                                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                                </div>
                                <p>{progress}% Complete</p>
                            </div>
                        ) : (
                            <div className="ready-state">
                                <Play size={64} className="text-primary mb-4" />
                                <h3>Ready to Train</h3>
                                <p>Target Variable: <span className="badge">{targetColumn}</span></p>
                                <button
                                    className="btn btn-primary btn-lg mt-4"
                                    onClick={handleTrain}
                                >
                                    Start Training
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="error-card card">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="text-error" />
                            <h3 className="text-error m-0">Training Failed</h3>
                        </div>
                        <p className="text-sm">{error}</p>
                        <p className="text-xs text-secondary mt-2">
                            Tip: Try a smaller dataset or check if the target column has valid values.
                            Ensure your backend server is running and has no errors.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrainPage;
