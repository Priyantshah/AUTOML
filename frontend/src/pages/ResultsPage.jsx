import React, { useEffect, useState } from 'react';
import { useAutoML } from '../context/AutoMLContext';
import { useNavigate } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
} from 'chart.js';
import { Bar, Pie, Line, Scatter } from 'react-chartjs-2';
import { ArrowRight, Trophy, BarChart2, PieChart, Activity, Download } from 'lucide-react';
import './ResultsPage.css';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
);

const ResultsPage = () => {
    const { trainResults: results, modelUrl } = useAutoML();
    const navigate = useNavigate();
    const [chartData, setChartData] = useState(null);
    const [pieData, setPieData] = useState(null);

    useEffect(() => {
        if (!results) {
            navigate('/train');
            return;
        }

        // Prepare Bar Chart Data (Compare Models)
        const modelNames = Object.keys(results.results);
        const scores = modelNames.map(name => {
            const metrics = results.results[name];
            // Use R2 for Regression, Accuracy for Classification
            return results.task_type === 'Regression' ? metrics.R2 : metrics.Accuracy;
        });

        setChartData({
            labels: modelNames,
            datasets: [
                {
                    label: results.task_type === 'Regression' ? 'R² Score' : 'Accuracy',
                    data: scores,
                    backgroundColor: modelNames.map(name =>
                        name === results.best_model ? 'rgba(16, 185, 129, 0.8)' : 'rgba(59, 130, 246, 0.6)'
                    ),
                    borderColor: modelNames.map(name =>
                        name === results.best_model ? 'rgba(16, 185, 129, 1)' : 'rgba(59, 130, 246, 1)'
                    ),
                    borderWidth: 1,
                },
            ],
        });

        // Prepare Pie Chart Data (Performance Distribution - just for visual variety, maybe share of total score?)
        // Actually, a pie chart isn't great for comparing scores, but requested. 
        // Let's show the relative performance.
        setPieData({
            labels: modelNames,
            datasets: [
                {
                    data: scores.map(s => Math.max(0, s)), // Ensure no negative values for pie
                    backgroundColor: [
                        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'
                    ],
                    borderWidth: 1,
                },
            ],
        });

    }, [results, navigate]);

    if (!results || !chartData) return null;

    const bestModelMetrics = results.results[results.best_model] || {};

    return (
        <div className="page-container animate-fade-in">
            <header className="page-header">
                <h1>Model Comparison Results</h1>
                <div className="flex items-center gap-4">
                    <p>Performance analysis of {Object.keys(results.results).length} trained models.</p>
                    <span className={`badge ${results.task_type === 'Regression' ? 'badge-blue' : 'badge-green'}`}>
                        {results.task_type} Task
                    </span>
                </div>
            </header>

            <div className="results-grid">
                {/* Best Model Highlight */}
                <div className="best-model-card card highlight-card">
                    <div className="trophy-icon">
                        <Trophy size={40} className="text-yellow-500" />
                    </div>
                    <div className="best-model-info">
                        <h3>Best Model: {results.best_model}</h3>
                        <div className="metrics-row">
                            <div className="metric">
                                <span className="label">{results.task_type === 'Regression' ? 'R² Score' : 'Accuracy'}</span>
                                <span className="value">{results.best_score?.toFixed(4)}</span>
                            </div>
                            {results.task_type === 'Regression' ? (
                                <div className="metric">
                                    <span className="label">RMSE</span>
                                    <span className="value">{bestModelMetrics.RMSE?.toFixed(4)}</span>
                                </div>
                            ) : (
                                <div className="metric">
                                    <span className="label">F1 Score</span>
                                    <span className="value">{bestModelMetrics.F1?.toFixed(4)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate('/predict')}>
                        Use This Model <ArrowRight size={18} />
                    </button>
                </div>

                {/* Charts Section */}
                <div className="charts-container">
                    <div className="chart-card card">
                        <h3><BarChart2 size={20} /> Model Comparison</h3>
                        <div className="chart-wrapper">
                            <Bar
                                data={chartData}
                                options={{
                                    responsive: true,
                                    plugins: {
                                        legend: { position: 'top' },
                                        title: { display: false }
                                    },
                                    scales: {
                                        y: { beginAtZero: true, max: 1.0 }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="chart-card card">
                        <h3><PieChart size={20} /> Performance Distribution</h3>
                        <div className="chart-wrapper">
                            <Pie
                                data={pieData}
                                options={{
                                    responsive: true,
                                    plugins: {
                                        legend: { position: 'right' }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="table-card card">
                    <h3>Detailed Metrics</h3>
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Model Name</th>
                                    {results.task_type === 'Regression' ? (
                                        <>
                                            <th>R²</th>
                                            <th>MAE</th>
                                            <th>MSE</th>
                                            <th>RMSE</th>
                                        </>
                                    ) : (
                                        <>
                                            <th>Accuracy</th>
                                            <th>Precision</th>
                                            <th>Recall</th>
                                            <th>F1 Score</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(results.results).map(([name, metrics]) => (
                                    <tr key={name} className={name === results.best_model ? 'highlight-row' : ''}>
                                        <td>
                                            {name}
                                            {name === results.best_model && <Trophy size={14} className="inline-trophy" />}
                                        </td>
                                        {results.task_type === 'Regression' ? (
                                            <>
                                                <td>{metrics.R2?.toFixed(4)}</td>
                                                <td>{metrics.MAE?.toFixed(4)}</td>
                                                <td>{metrics.MSE?.toFixed(4)}</td>
                                                <td>{metrics.RMSE?.toFixed(4)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{metrics.Accuracy?.toFixed(4)}</td>
                                                <td>{metrics.Precision?.toFixed(4)}</td>
                                                <td>{metrics.Recall?.toFixed(4)}</td>
                                                <td>{metrics.F1?.toFixed(4)}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultsPage;
