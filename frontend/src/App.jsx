import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './App.css';

// Use environment variable for the API base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL;

// --- Robust Icon Handling for Leaflet ---
// Fix for default icon paths in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const defaultIcon = new L.Icon.Default();
const highlightIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function App() {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [driverMarkers, setDriverMarkers] = useState({});
  const driversLayerRef = useRef(null);
  const [queryCircle, setQueryCircle] = useState(null);
  const [loading, setLoading] = useState(false);
  const DEFAULT_RADIUS = 1000; // 1 km
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [redMarker, setRedMarker] = useState(null);

  // Initialize map
  useEffect(() => {
    if (map || !mapRef.current) return;
    const leafletMap = L.map(mapRef.current).setView([17.3850, 78.4867], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap);
    const layer = L.layerGroup().addTo(leafletMap);
    driversLayerRef.current = layer;
    setMap(leafletMap);

    return () => leafletMap.remove();
  }, []);

  // Utility to generate random point within radius (meters)
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const randomPointInRadius = (lat, lng, radiusMeters) => {
    const radiusInDegrees = radiusMeters / 111320; // rough conversion
    const u = Math.random();
    const v = Math.random();
    const w = radiusInDegrees * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const newLat = lat + w * Math.cos(t);
    const newLng = lng + w * Math.sin(t) / Math.cos(lat * Math.PI / 180);
    return { lat: newLat, lng: newLng };
  };

  // Add or update a driver marker on the map and Redis
  const upsertDriver = async (id, lat, lng) => {
    try {
      await axios.post(`${API_BASE}/drivers/${id}/location`, {
        latitude: lat,
        longitude: lng,
      });
      setDriverMarkers((prev) => {
        const newMarkers = { ...prev };
        if (newMarkers[id]) {
          newMarkers[id].setLatLng([lat, lng]);
          newMarkers[id].setPopupContent(`Driver: ${id}<br/>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
        } else {
          const m = L.marker([lat, lng], { icon: defaultIcon })
            .bindPopup(`Driver: ${id}<br/>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
          m.addTo(driversLayerRef.current);
          // Show popup on hover
          m.on('mouseover', () => m.openPopup());
          m.on('mouseout', () => m.closePopup());
          newMarkers[id] = m;
        }
        return newMarkers;
      });
    } catch (err) {
      console.error(`Failed to upsert driver ${id}:`, err);
    }
  };


  // Helper to query backend and update markers/count
  const updateNearbyDrivers = async (centerLat, centerLng) => {
    try {
      const res = await axios.get(`${API_BASE}/geofence`, {
        params: { latitude: centerLat, longitude: centerLng, radius }
      });
      const nearbyDrivers = res.data;
      setNearbyCount(nearbyDrivers.length);
      const nearbyDriverIds = new Set(nearbyDrivers.map((d) => d.driverId));

      // Update marker icons based on query result
      Object.entries(driverMarkers).forEach(([id, marker]) => {
        if (nearbyDriverIds.has(id)) {
          marker.setIcon(highlightIcon);
        } else {
          marker.setIcon(defaultIcon);
        }
      });
    } catch (err) {
      console.error('Failed to refresh nearby drivers:', err);
    }
  };

  // Handle map click for geofence query
  const handleMapClick = async (e) => {
    if (!map) return;
    const { lat, lng } = e.latlng;

    // Add or move the red marker at the clicked location
    if (redMarker) {
      redMarker.setLatLng([lat, lng]);
      redMarker.setPopupContent(`Clicked Location:<br/>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
    } else {
      const marker = L.marker([lat, lng], { icon: redIcon })
        .addTo(map)
        .bindPopup(`Your Location:<br/>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
      setRedMarker(marker);
      // Show popup on hover
      marker.on('mouseover', () => marker.openPopup());
      marker.on('mouseout', () => marker.closePopup());
    }
    if (redMarker) redMarker.openPopup();

    if (queryCircle) {
      queryCircle.setLatLng(e.latlng);
      queryCircle.setRadius(radius);
    } else {
      const newCircle = L.circle([lat, lng], { radius, color: '#007bff', weight: 2 }).addTo(map);
      setQueryCircle(newCircle);
    }

    try {
      // Clear existing driver markers
      if (driversLayerRef.current) driversLayerRef.current.clearLayers();
      setDriverMarkers({});
      setNearbyCount(0);

      setLoading(true);
      // Wait 2 seconds before adding new drivers
      await sleep(2000);

      // Simulate a random number (5-15) of drivers, some inside and some outside the circle
      const driverCount = Math.floor(Math.random() * 11) + 5; // 5-15
      const insideCount = Math.floor(driverCount * 0.7); // 70% inside
      const outsideCount = driverCount - insideCount;
      const simulatedDrivers = [];
      // Inside drivers
      for (let i = 0; i < insideCount; i++) {
        const point = randomPointInRadius(lat, lng, radius * 0.8);
        simulatedDrivers.push({ id: `driver${i + 1}`, lat: point.lat, lng: point.lng });
      }
      // Outside drivers (between 1.2x and 2x radius)
      for (let i = 0; i < outsideCount; i++) {
        const r = radius * (1.2 + Math.random() * 0.8); // 1.2x to 2x radius
        const point = randomPointInRadius(lat, lng, r);
        simulatedDrivers.push({ id: `driver${insideCount + i + 1}`, lat: point.lat, lng: point.lng });
      }

      for (const d of simulatedDrivers) {
        await upsertDriver(d.id, d.lat, d.lng);
      }

      await updateNearbyDrivers(lat, lng);

    } catch (error) {
      console.error('Failed to fetch nearby drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (map) map.on('click', handleMapClick);
    return () => {
      if (map) map.off('click', handleMapClick);
    };
  }, [map, driverMarkers, queryCircle, radius]); // Dependencies for the effect

  // Update circle radius when slider changes
  useEffect(() => {
    if (queryCircle) {
      queryCircle.setRadius(radius);
    }
    if (queryCircle) {
      queryCircle.setRadius(radius);
      const { lat, lng } = queryCircle.getLatLng();
      updateNearbyDrivers(lat, lng);
    }
  }, [radius]);

  return (
    <div className="app-container">
      <div className="controls">
        <h2>Geo-Fence Demo</h2>
        <p>Real-time driver tracking and proximity alerts.</p>
        {loading ? (
          <div className="spinner"></div>
        ) : (
          <p><strong>Drivers within {(radius/1000).toFixed(1)} km:</strong> {nearbyCount}</p>
        )}
        <div className="slider">
          <label>
            
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
          </label>
        </div>
        <p className="instructions">Click on the map to find drivers within {radius} m.</p>
      </div>
      <div ref={mapRef} className="map-container"></div>
    </div>
  );
}

export default App;