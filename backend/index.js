const express = require('express');
const cors = require('cors');
const app = express();
const driverRoutes = require('./routes/driverRoutes');
const geofenceRoutes = require('./routes/geofenceRoutes');
app.use(cors());
app.use(express.json());
app.use('/api', driverRoutes);
app.use('/api', geofenceRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});