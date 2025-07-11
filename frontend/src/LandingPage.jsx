import React from 'react';
import './LandingPage.css'; // We will create this new CSS file

const cities = [
  { name: 'Delhi', coords: { lat: 28.6139, lng: 77.2090 } },
  { name: 'Mumbai', coords: { lat: 19.0760, lng: 72.8777 } },
  { name: 'Bangalore', coords: { lat: 12.9716, lng: 77.5946 } },
  { name: 'Hyderabad', coords: { lat: 17.3850, lng: 78.4867 } },
  { name: 'Nagpur', coords: { lat: 21.1458, lng: 79.0882 } },
  { name: 'Pune', coords: { lat: 18.5204, lng: 73.8567 } },
];

export default function LandingPage({ onSelectCity }) {
  return (
    <div className="landing-split-container">
      <div className="landing-split-left">
        <div className="landing-content">
          <h1 className="landing-title">Geofence</h1>
          <p className="landing-tagline">
            An interactive dashboard showcasing a high-performance, event-driven architecture for real-time geofencing and fleet monitoring.
          </p>
          <hr className="landing-divider" />
          <h2 className="landing-cta">Select a Demo Scenario to Begin</h2>
          <div className="city-grid">
            {cities.map(city => (
              <button
                key={city.name}
                className="city-btn"
                onClick={() => onSelectCity(city)}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="landing-split-right">
        <div className="landing-image" />
      </div>
    </div>
  );
}