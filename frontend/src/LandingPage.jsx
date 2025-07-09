import React from 'react';
import './LandingPage.css';

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
    <div className="landing-container">
      <h1>Welcome to Fleet-Track</h1>
      <h2>Select a City to Start</h2>
      <div className="city-options">
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
  );
} 