import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Benchmark() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const runBenchmark = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/benchmark`);
      setResult(res.data);
    } catch {
      setError('Failed to run benchmark.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="benchmark-page" style={{ padding: 32, textAlign: 'center' }}>
      <h2>System Benchmark</h2>
      <button onClick={runBenchmark} disabled={loading} style={{ marginBottom: 24 }}>
        {loading ? 'Running...' : 'Run Proximity Query Test'}
      </button>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      {result && (
        <div className="benchmark-result" style={{ marginTop: 24 }}>
          <h3>Results</h3>
          <p><b>Query:</b> {result.query}</p>
          <p><b>Redis (In-Memory):</b> {result.redisTime} ms</p>
          <p><b>MongoDB (Disk-based 2dsphere):</b> {result.mongoTime} ms</p>
          <p><b>Result:</b> Redis is {result.mongoTime && result.redisTime ? (result.mongoTime / result.redisTime).toFixed(1) : '?'}x faster for this real-time query.</p>
        </div>
      )}
      <div style={{ marginTop: 40 }}>
        <button onClick={() => navigate('/')}>Back to Dashboard</button>
      </div>
    </div>
  );
} 