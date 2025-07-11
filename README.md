# Geofence Fleet Tracking System

A full-stack geofencing and fleet management system with real-time driver tracking, zone management, and performance benchmarking. Built with Node.js, Express, MongoDB, Redis, React, Leaflet, and Docker.

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Folder Structure](#folder-structure)
- [Setup Instructions](#setup-instructions)
  - [Development](#development)
  - [Docker](#docker)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [API Endpoints (Backend)](#api-endpoints-backend)
- [Data Models (Backend)](#data-models-backend)
- [Technologies Used](#technologies-used)
- [Contribution](#contribution)
- [License](#license)

---

## Overview
This project provides a platform to:
- Track drivers in real-time on a map
- Define geofenced zones (Pickup, Dropoff, No Entry)
- Simulate driver movement in various cities
- Benchmark geospatial query performance (Redis vs MongoDB)
- Receive alerts when drivers enter/exit zones

---

## Features
- **Interactive Map Dashboard** (React + Leaflet)
- **Zone Management**: Create, edit, delete geofenced zones
- **Driver Simulation**: Simulate multiple drivers moving in real cities
- **Real-Time Tracking**: Live driver updates via Socket.IO
- **Alerting**: Backend emits alerts when drivers enter/exit zones
- **Performance Analysis**: Comprehensive database performance analysis with proper benchmarking methodology
- **Dockerized**: Easy deployment with Docker Compose

---

## Folder Structure
```
geofence/
  backend/         # Node.js/Express API, MongoDB, Redis, Socket.IO, simulation, alerting
    controllers/   # Route controllers
    models/        # Mongoose models (Driver, Zone, Benchmark)
    routes/        # API route definitions
    alerter.js     # Zone entry/exit alert logic
    simulator.js   # Driver movement simulator
    index.js       # API server entry point
    redisClient.js # Redis connection
    Dockerfile     # Backend Docker build
  frontend/        # React + Vite + Leaflet client
    src/           # React components, context, styles
    public/        # Static assets
    Dockerfile     # Frontend Docker build
  docker-compose.yml # Multi-service orchestration
  production.env.template # Example environment variables
```

---

## Setup Instructions

### Development
#### Prerequisites
- Node.js (v18+)
- MongoDB
- Redis
- (Optional) OpenRouteService API key for simulation

#### 1. Backend
```bash
cd backend
npm install
cp ../production.env.template .env # Edit as needed
node index.js
```

#### 2. Frontend
```bash
cd frontend
npm install
cp ../production.env.template .env # Edit as needed
npm run dev
```

#### 3. (Optional) Start Simulator & Alerter
- Simulator is triggered via the frontend (city selection)
- To run the alerter (zone entry/exit alerts):
  ```bash
  node alerter.js
  ```

### Docker
1. Ensure Docker and Docker Compose are installed
2. Create a `.env` file at the root (see [Environment Variables](#environment-variables))
3. Start all services:
   ```bash
   docker-compose up --build
   ```

---

## Usage
- Open the frontend in your browser (default: http://localhost:80 or as mapped)
- Select a city to simulate drivers
- Draw zones on the map (Pickup, Dropoff, No Entry)
- View real-time driver movement and zone entry/exit alerts
- Run comprehensive performance analysis to understand database trade-offs for geospatial queries

---

## Environment Variables
See `production.env.template` for all variables. Key ones:

| Variable           | Description                        | Example                        |
|--------------------|------------------------------------|---------------------------------|
| REDIS_URL          | Redis connection string             | redis://localhost:6379         |
| MONGO_URI          | MongoDB connection string           | mongodb://localhost:27017/geofence |
| ORS_API_KEY        | OpenRouteService API key (simulator)| your-api-key                   |
| VITE_API_BASE_URL  | Frontend API base URL               | http://localhost:5000/api      |
| SOCKET_URL         | Socket.IO server URL (alerter)      | http://localhost:5000          |

---

## API Endpoints (Backend)

### Driver APIs
- `POST   /api/drivers/:driverId/location` — Update driver location
- `GET    /api/drivers/:driverId` — Get driver info
- `POST   /api/drivers/:driverId` — Set driver metadata
- `GET    /api/drivers` — List all drivers

### Geofence/Zone APIs
- `GET    /api/geofence` — Get drivers near a point (proximity query)
- `POST   /api/zones` — Create a new zone
- `GET    /api/zones` — List all zones
- `DELETE /api/zones/:zoneId` — Delete a zone

### Performance Analysis API
- `GET    /api/benchmark` — Run comprehensive database performance analysis with proper methodology

### Simulation
- `POST   /api/simulate` — Start driver simulation for a city

---

## Data Models (Backend)

### Driver
```js
{
  driverId: String, // unique
  latitude: Number,
  longitude: Number,
  // timestamps: createdAt, updatedAt
}
```

### Zone
```js
{
  name: String,
  type: 'No Entry' | 'Pickup' | 'Dropoff',
  geojson: {
    type: 'Polygon',
    coordinates: [[[lng, lat], ...]]
  }
}
```

---

## Technologies Used
- **Backend**: Node.js, Express, MongoDB, Mongoose, Redis, Socket.IO, dotenv
- **Frontend**: React, Vite, Leaflet, MUI, Axios, Socket.IO Client
- **Simulation**: OpenRouteService API
- **Containerization**: Docker, Docker Compose

---

## Contribution
Contributions are welcome! Please open issues or submit pull requests for improvements, bug fixes, or new features.