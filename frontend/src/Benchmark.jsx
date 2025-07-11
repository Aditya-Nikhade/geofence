import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCity } from './CityContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Benchmark() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const selectedCity = useCity();

  useEffect(() => {
    if (!selectedCity) {
      navigate('/', { replace: true });
      return;
    }
    const handlePopState = () => {
      if (selectedCity) {
        navigate('/dashboard', { replace: true });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate, selectedCity]);

  const runBenchmark = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/benchmark`);
      setResult(res.data);
    } catch (err) {
      setError('Failed to run benchmark: ' + (err.response?.data?.details || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="benchmark-page" style={{ maxWidth: 1400, margin: '0 auto', padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, width: '100%' }}>
        <span style={{ fontSize: '2.2em', fontWeight: 600, color: '#1971c2', letterSpacing: '-1px' }}>Database Performance Analysis</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <button 
            onClick={runBenchmark} 
            disabled={loading} 
            style={{ 
              padding: '12px 24px', 
              fontSize: '16px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600
            }}
          >
            {loading ? 'Running Analysis...' : 'Run Performance Analysis'}
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{ 
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
      <div style={{ width: '100%' }}>
        {error && (
          <div style={{ 
            color: 'red', 
            marginBottom: 16, 
            padding: '12px',
            backgroundColor: '#ffe6e6',
            borderRadius: '6px',
            border: '1px solid #ffcccc'
          }}>
            {error}
          </div>
        )}
        {result && (
          <div className="benchmark-result">
            {/* Summary */}
            <div className="benchmark-summary">
              <h3>Analysis Summary</h3>
              <p><strong>Data Points:</strong> {result.dataPoints} driver locations</p>
              <p><strong>Test Scenarios:</strong> {result.results.length} different radius sizes</p>
              <p>{result.analysis.summary}</p>
            </div>

            {/* Results Table */}
            <div style={{ marginBottom: '32px' }}>
              <h3>Performance Results</h3>
              <div style={{ overflowX: 'auto', overflowY: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  border: '1px solid #ddd',
                  fontSize: '1.05em',
                  minWidth: 900
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Scenario</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Radius</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Expected Results</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Redis (ms)</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>MongoDB (ms)</th>
                      <th style={{ padding: '12px', border: '1px solid #ddd' }}>Performance Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((row, index) => (
                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                        <td style={{ padding: '12px', border: '1px solid #ddd' }}>{row.scenario}</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd' }}>{row.radius}m</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd' }}>{row.expectedCount}</td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', color: '#28a745' }}>
                          {row.redis.avgTime}ms
                          <br />
                          <small>({row.redis.minTime}-{row.redis.maxTime})</small>
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', color: '#dc3545' }}>
                          {row.mongo.avgTime}ms
                          <br />
                          <small>({row.mongo.minTime}-{row.mongo.maxTime})</small>
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                          {row.performanceRatio}x faster
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Findings */}
            <div style={{ marginBottom: '32px' }}>
              <h3>Key Findings</h3>
              <ul style={{ lineHeight: '1.6' }}>
                {result.analysis.keyFindings.map((finding, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>{finding}</li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div style={{ marginBottom: '32px' }}>
              <h3>Recommendations</h3>
              <ul style={{ lineHeight: '1.6' }}>
                {result.analysis.recommendations.map((rec, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>{rec}</li>
                ))}
              </ul>
            </div>

            {/* Trade-offs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ 
                backgroundColor: '#e8f5e8', 
                padding: '20px', 
                borderRadius: '8px',
                border: '1px solid #c3e6c3'
              }}>
                <h4 style={{ marginTop: 0, color: '#155724' }}>Redis Advantages</h4>
                <ul style={{ color: '#155724' }}>
                  {result.analysis.tradeOffs.redis.pros.map((pro, index) => (
                    <li key={index} style={{ marginBottom: '6px' }}>{pro}</li>
                  ))}
                </ul>
                <h5 style={{ color: '#721c24' }}>Limitations</h5>
                <ul style={{ color: '#721c24' }}>
                  {result.analysis.tradeOffs.redis.cons.map((con, index) => (
                    <li key={index} style={{ marginBottom: '6px' }}>{con}</li>
                  ))}
                </ul>
              </div>

              <div style={{ 
                backgroundColor: '#e8f4fd', 
                padding: '20px', 
                borderRadius: '8px',
                border: '1px solid #b3d9ff'
              }}>
                <h4 style={{ marginTop: 0, color: '#0c5460' }}>MongoDB Advantages</h4>
                <ul style={{ color: '#0c5460' }}>
                  {result.analysis.tradeOffs.mongodb.pros.map((pro, index) => (
                    <li key={index} style={{ marginBottom: '6px' }}>{pro}</li>
                  ))}
                </ul>
                <h5 style={{ color: '#721c24' }}>Limitations</h5>
                <ul style={{ color: '#721c24' }}>
                  {result.analysis.tradeOffs.mongodb.cons.map((con, index) => (
                    <li key={index} style={{ marginBottom: '6px' }}>{con}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 