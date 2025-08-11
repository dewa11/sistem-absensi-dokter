require('dotenv').config();

// Haversine formula to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in meters
  return distance;
};

// Check if location is within authorized geofence
const isWithinGeofence = (userLat, userLng) => {
  try {
    const authorizedLat = parseFloat(process.env.AUTHORIZED_LAT || -6.200000);
    const authorizedLng = parseFloat(process.env.AUTHORIZED_LNG || 106.816666);
    const radius = parseInt(process.env.GEOFENCE_RADIUS || 500);

    // Validate input coordinates
    if (!userLat || !userLng || 
        userLat < -90 || userLat > 90 || 
        userLng < -180 || userLng > 180) {
      throw new Error('Invalid coordinates provided');
    }

    const distance = calculateDistance(
      authorizedLat, 
      authorizedLng, 
      userLat, 
      userLng
    );

    return {
      isWithin: distance <= radius,
      distance: Math.round(distance),
      maxDistance: radius,
      authorizedLocation: {
        lat: authorizedLat,
        lng: authorizedLng
      }
    };
  } catch (error) {
    throw new Error(`Geofence validation failed: ${error.message}`);
  }
};

// Validate coordinates format
const validateCoordinates = (lat, lng) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return { valid: false, message: 'Coordinates must be valid numbers' };
  }

  if (latitude < -90 || latitude > 90) {
    return { valid: false, message: 'Latitude must be between -90 and 90' };
  }

  if (longitude < -180 || longitude > 180) {
    return { valid: false, message: 'Longitude must be between -180 and 180' };
  }

  return { valid: true, lat: latitude, lng: longitude };
};

module.exports = {
  calculateDistance,
  isWithinGeofence,
  validateCoordinates
};
