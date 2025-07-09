import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Benchmark from './Benchmark';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
// If you have installed leaflet-gesture-handling, import it:
// import 'leaflet-gesture-handling';
import './App.css';
import { io } from 'socket.io-client';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import LandingPage from './LandingPage';
import { CityContext } from './CityContext';

// Using a robust library or a well-tested function is better.
function pointInPolygon(point, polygon) {
    const [lat, lng] = point;
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][1], yi = polygon[i][0];
        const xj = polygon[j][1], yj = polygon[j][0];
        const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Leaflet Icon Fix for Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
const defaultIcon = new L.Icon.Default();

function Dashboard() {
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const driversLayerRef = useRef(null);
    const zonesLayerRef = useRef(null);
    const drawControlRef = useRef(null); // Ref to store the draw control instance

    const [zones, setZones] = useState([]);
    const [selectedZoneIndex, setSelectedZoneIndex] = useState(-1);
    const [driversInZone, setDriversInZone] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [zoneType, setZoneType] = useState('Pickup');
    const [driversVersion, setDriversVersion] = useState(0);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [zoneDriverCounts, setZoneDriverCounts] = useState([]);

    const driversRef = useRef({});
    const zonesRef = useRef(zones);
    useEffect(() => { zonesRef.current = zones; }, [zones]);

    const zoneTypeColors = {
        'No Entry': '#e74c3c', 'Pickup': '#27ae60', 'Dropoff': '#2980b9',
    };

    // --- 1. Initialize Map & Layers (Runs ONCE) ---
    // This effect is now stabilized to correctly initialize and clean up the map.
    useEffect(() => {
        if (!map && mapRef.current) {
            const leafletMap = L.map(mapRef.current, {
                dragging: true,
                touchZoom: true,       // Pinch-to-zoom
                scrollWheelZoom: true,
                doubleClickZoom: true,
                boxZoom: true,
                keyboard: true,
                tap: true,            // Fixes touch clicks
                gestureHandling: true // Prevents conflicts with browser gestures
            }).setView([17.3850, 78.4867], 12);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(leafletMap);

            driversLayerRef.current = L.markerClusterGroup().addTo(leafletMap);
            zonesLayerRef.current = L.featureGroup().addTo(leafletMap);
            setMap(leafletMap);
        }

        return () => {
            if (map) {
                map.remove();
            }
        };
    }, [map]);

    // --- 2. Initialize Leaflet.Draw and Fetch Initial Data ---
    // This effect now correctly handles the draw control to prevent duplicates.
    useEffect(() => {
        if (!map) return;

        // Fetch initial zones when the map is ready
        axios.get(`${API_BASE}/api/zones`)
            .then(res => setZones(res.data))
            .catch(err => console.error('Failed to load zones:', err));

        // THE FIX: Only create the draw control if it doesn't already exist.
        if (!drawControlRef.current) {
            drawControlRef.current = new L.Control.Draw({
                draw: {
                    polygon: { shapeOptions: { color: '#666' } },
                    polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false,
                },
                edit: { featureGroup: zonesLayerRef.current }
            });
            map.addControl(drawControlRef.current);
        }
        
        const handleZoneCreate = async (e) => {
            const layer = e.layer;
            const name = window.prompt('Enter a name for this zone:');
            if (!name) return;

            try {
                // The handler always has access to the latest `zoneType` from state.
                const response = await axios.post(`${API_BASE}/api/zones`, {
                    name,
                    geojson: layer.toGeoJSON().geometry,
                    type: zoneType,
                });
                alert('Zone saved!');
                setZones(prev => [...prev, response.data]);
                setSelectedZoneIndex(zones.length);
            } catch {
                alert('Failed to save zone');
            }
        };

        // --- ADDED: Handler for editing zones ---
        const handleZoneEdit = (e) => {
            const layers = e.layers;
            const updatedZones = [...zonesRef.current];
            layers.eachLayer(layer => {
                // Try to match by name from popup, fallback to geometry match if needed
                const popupContent = layer.getPopup()?.getContent();
                let zoneName = null;
                if (popupContent) {
                    const nameMatch = popupContent.match(/<b>Zone:<\/b> (.*?)<br/);
                    zoneName = nameMatch ? nameMatch[1] : null;
                }
                const idx = zoneName ? updatedZones.findIndex(z => z.name === zoneName) : -1;
                if (idx !== -1) {
                    updatedZones[idx] = {
                        ...updatedZones[idx],
                        geojson: layer.toGeoJSON().geometry
                    };
                }
            });
            setZones(updatedZones);
        };

        map.on(L.Draw.Event.CREATED, handleZoneCreate);
        map.on(L.Draw.Event.EDITED, handleZoneEdit);

        return () => {
            map.off(L.Draw.Event.CREATED, handleZoneCreate);
            map.off(L.Draw.Event.EDITED, handleZoneEdit);
        };
    }, [map, zoneType]); // Removed zones as dependency

    // --- 3. Render/Update Zone Polygons on Map ---
    useEffect(() => {
        if (!zonesLayerRef.current) return;
        zonesLayerRef.current.clearLayers();
        zones.forEach((zone, idx) => {
            const isSelected = idx === selectedZoneIndex;
            const polygon = L.polygon(zone.geojson.coordinates[0].map(([lng, lat]) => [lat, lng]), {
                color: zoneTypeColors[zone.type] || '#ff7800',
                weight: isSelected ? 4 : 2, fillOpacity: isSelected ? 0.25 : 0.1, dashArray: isSelected ? '5, 10' : null,
            }).addTo(zonesLayerRef.current);
            polygon.bindPopup(`<b>Zone:</b> ${zone.name}<br/><b>Type:</b> ${zone.type}`);
        });
    }, [zones, selectedZoneIndex]);

    // --- 4. Handle Deleting a Zone ---
    const handleDeleteZone = async () => {
        if (selectedZoneIndex < 0 || selectedZoneIndex >= zones.length) {
            alert("Please select a zone to delete.");
            return;
        }
        const zoneToDelete = zones[selectedZoneIndex];
        if (window.confirm(`Are you sure you want to delete the zone "${zoneToDelete.name}"?`)) {
            try {
                await axios.delete(`${API_BASE}/api/zones/${zoneToDelete._id}`);
                alert("Zone deleted successfully.");
                setZones(prev => prev.filter(z => z._id !== zoneToDelete._id));
                setSelectedZoneIndex(-1);
            } catch (err) {
                console.error("Failed to delete zone:", err);
                alert("Error deleting zone.");
            }
        }
    };

    // --- 5. Socket.IO Connection ---
    useEffect(() => {
        const socket = io(API_BASE, { transports: ["websocket"] });
        socket.on('connect', () => console.log('[Socket.IO] Connected'));
        socket.on('driverUpdated', ({ driverId, location }) => {
            const latLng = [location.latitude, location.longitude];
            if (driversRef.current[driverId]) {
                driversRef.current[driverId].setLatLng(latLng);
            } else {
                const newMarker = L.marker(latLng, { icon: defaultIcon })
                  .bindPopup(`<b>Driver:</b> ${driverId}`)
                  .on('click', () => {
                      setSelectedDriver({ driverId, location, lastUpdated: Date.now() });
                  });
                driversRef.current[driverId] = newMarker;
            }
            // THE FIX: If the updated driver is the one being viewed, refresh the details panel.
            if (selectedDriver && selectedDriver.driverId === driverId) {
                setSelectedDriver(prev => ({ ...prev, location, lastUpdated: Date.now() }));
            }
            setDriversVersion(v => v + 1);
        });
        return () => socket.disconnect();
    }, [selectedDriver]); // Dependency added to ensure the click handler has access to the latest state.

    // --- 6. Apply Driver Filters ---
    useEffect(() => {
        if (!driversLayerRef.current) return;
        const selectedZone = zones[selectedZoneIndex];
        const selectedPolyLatLng = selectedZone?.geojson.coordinates[0].map(([lng, lat]) => [lat, lng]);

        Object.entries(driversRef.current).forEach(([driverId, marker]) => {
            const latLng = marker.getLatLng();
            const matchesSearch = driverId.toLowerCase().includes(searchTerm.toLowerCase());
            let isInside = false;
            if(selectedPolyLatLng) {
                isInside = pointInPolygon([latLng.lat, latLng.lng], selectedPolyLatLng);
            }
            let matchesStatus = (statusFilter === 'all') || (statusFilter === 'in' && isInside) || (statusFilter === 'out' && !isInside);
            if (matchesSearch && matchesStatus) {
                if (!driversLayerRef.current.hasLayer(marker)) {
                    driversLayerRef.current.addLayer(marker);
                }
            } else {
                if (driversLayerRef.current.hasLayer(marker)) {
                    driversLayerRef.current.removeLayer(marker);
                }
            }
        });
    }, [searchTerm, statusFilter, driversVersion, selectedZoneIndex, zones]);
    
    // --- 7. Count Drivers in Selected Zone ---
    useEffect(() => {
        const selectedZone = zones[selectedZoneIndex];
        if (!selectedZone) {
            setDriversInZone(0);
            return;
        }
        const polyLatLng = selectedZone.geojson.coordinates[0].map(([lng, lat]) => [lat, lng]);
        let count = 0;
        Object.values(driversRef.current).forEach(marker => {
            if (pointInPolygon([marker.getLatLng().lat, marker.getLatLng().lng], polyLatLng)) {
                count++;
            }
        });
        setDriversInZone(count);
    }, [driversVersion, selectedZoneIndex, zones]);

    // --- 8. Count Drivers for ALL Zones (Live Dashboard) ---
    useEffect(() => {
        const counts = zones.map(zone => {
            const polyLatLng = zone.geojson.coordinates[0].map(([lng, lat]) => [lat, lng]);
            let count = 0;
            Object.values(driversRef.current).forEach(marker => {
                if (pointInPolygon([marker.getLatLng().lat, marker.getLatLng().lng], polyLatLng)) {
                    count++;
                }
            });
            return count;
        });
        setZoneDriverCounts(counts);
    }, [driversVersion, zones]);

    const navigate = useNavigate();
    return (
        <div className="app-container">
            <div className="sidebar">
                <div className="controls">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2>Fleet-Track</h2>
                        <button onClick={() => navigate('/benchmark')} style={{ marginLeft: 12, fontSize: 14, padding: '4px 10px' }}>Test Benchmark</button>
                    </div>
                        
                    <div className="control-group">
                        <label><b>Manage Zones</b></label>
                        <div className="zone-management">
                            <select value={selectedZoneIndex} onChange={e => setSelectedZoneIndex(Number(e.target.value))}>
                                <option value="-1">-- Select a Zone --</option>
                                {zones.map((zone, idx) => (
                                    <option key={zone._id || idx} value={idx}>
                                        {zone.name} ({zone.type})
                                    </option>
                                ))}
                            </select>
                            <button className="delete-btn" onClick={handleDeleteZone} disabled={selectedZoneIndex < 0}>
                                Delete
                            </button>
                        </div>
                    </div>

                    <div className="control-group zone-count">
                        <p><b>Drivers in selected zone:</b> {selectedZoneIndex < 0 ? 'N/A' : driversInZone}</p>
                        <p><b>Zone Type:</b> {zones[selectedZoneIndex]?.type || 'N/A'}</p>
                    </div>

                    <div className="control-group">
                         <label><b>Filter Drivers in Zone</b></label>
                        <div className="driver-filters">
                          <input
                              type="text"
                              placeholder="Search by ID"
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                              disabled={selectedZoneIndex < 0}
                          />
                          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} disabled={selectedZoneIndex < 0}>
                              <option value="all">All</option>
                              <option value="in">In Zone</option>
                              <option value="out">Out of Zone</option>
                          </select>
                        </div>
                    </div>

                    <div className="control-group">
                        <label><b>New Zone Type</b></label>
                        <select value={zoneType} onChange={e => setZoneType(e.target.value)}>
                            <option value="Pickup">Pickup</option>
                            <option value="Dropoff">Dropoff</option>
                            <option value="No Entry">No Entry</option>
                        </select>
                        <small>Select type, then use map tools to draw.</small>
                    </div>
                </div>
                
                {/* Panel for selected driver details */}
                {selectedDriver && (
                  <div className="sidebar-panel driver-details-panel">
                    <h3>Driver Details</h3>
                    <p><b>ID:</b> {selectedDriver.driverId}</p>
                    <p><b>Location:</b> {selectedDriver.location.latitude.toFixed(5)}, {selectedDriver.location.longitude.toFixed(5)}</p>
                    <p><b>Updated:</b> {new Date(selectedDriver.lastUpdated).toLocaleTimeString()}</p>
                    <button onClick={() => setSelectedDriver(null)}>Close</button>
                  </div>
                )}
                
                {/* Panel for live dashboard of all zones */}
                <div className="sidebar-panel live-dashboard-panel">
                  <h3>Live Dashboard</h3>
                  <ul className="zone-dashboard-list">
                    {zones.map((zone, idx) => (
                      <li key={zone._id || idx} className={idx === selectedZoneIndex ? 'selected' : ''} onClick={() => setSelectedZoneIndex(idx)}>
                        <span>{zone.name} ({zone.type})</span>
                        <span className="driver-count-badge">{zoneDriverCounts[idx] || 0}</span>
                      </li>
                    ))}
                    {zones.length === 0 && <li>No zones defined.</li>}
                  </ul>
                </div>

            </div>
            <div ref={mapRef} className="map-container"></div>
        </div>
    );
}

function AppWithCity() {
    const [selectedCity, setSelectedCity] = useState(() => {
        const saved = sessionStorage.getItem('selectedCity');
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        const handlePopState = () => {
            setSelectedCity(null);
            sessionStorage.removeItem('selectedCity');
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        if (selectedCity) sessionStorage.setItem('selectedCity', JSON.stringify(selectedCity));
    }, [selectedCity]);

    const handleSelectCity = async (city) => {
        setSelectedCity(city);
        try {
            await axios.post(`${API_BASE}/api/simulate`, { city: city.name, coords: city.coords });
        } catch {
            alert('Failed to start simulation for this city.');
        }
    };

    if (!selectedCity) {
        return <LandingPage onSelectCity={handleSelectCity} />;
    }

    return (
        <CityContext.Provider value={selectedCity}>
            <Router>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/benchmark" element={<Benchmark />} />
                </Routes>
            </Router>
        </CityContext.Provider>
    );
}

export default AppWithCity;