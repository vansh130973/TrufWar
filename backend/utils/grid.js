/**
 * Grid utility for 50x50 meter territory cells.
 * Converts GPS coordinates to discrete grid keys.
 */

const CELL_SIZE_M = 50; // meters per cell

/**
 * Convert lat/lng to grid key string
 * Uses meter-projected rounding
 */
function latLngToGridKey(lat, lng) {
  const latCells = Math.floor((lat * 111000) / CELL_SIZE_M);
  const lngCells = Math.floor((lng * Math.cos((lat * Math.PI) / 180) * 111000) / CELL_SIZE_M);
  return `${latCells}_${lngCells}`;
}

/**
 * Get center lat/lng for a grid key
 */
function gridKeyToLatLng(gridKey) {
  const [latCells, lngCells] = gridKey.split('_').map(Number);
  // Approximate center (lat correction for lng is approximate)
  const lat = ((latCells + 0.5) * CELL_SIZE_M) / 111000;
  // We use a fixed lat for lng correction (small error, acceptable for display)
  const lng = ((lngCells + 0.5) * CELL_SIZE_M) / (111000 * Math.cos((lat * Math.PI) / 180));
  return { lat, lng };
}

/**
 * Given an array of {lat, lng} coordinates, return all unique grid keys touched
 */
function coordinatesToGridKeys(coordinates) {
  const keySet = new Set();
  for (const { lat, lng } of coordinates) {
    keySet.add(latLngToGridKey(lat, lng));
  }
  return Array.from(keySet);
}

/**
 * Haversine distance between two points in meters
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Compute total distance for an array of coordinates
 */
function computeTotalDistance(coordinates) {
  if (!coordinates || coordinates.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    total += haversineDistance(
      coordinates[i - 1].lat,
      coordinates[i - 1].lng,
      coordinates[i].lat,
      coordinates[i].lng
    );
  }
  return total;
}

/**
 * Get cell corner bounds for a grid key
 */
function gridKeyToBounds(gridKey, centerLat) {
  const lat = centerLat || gridKeyToLatLng(gridKey).lat;
  const CELL_LAT = CELL_SIZE_M / 111000;
  const CELL_LNG = CELL_SIZE_M / (111000 * Math.cos((lat * Math.PI) / 180));
  const center = gridKeyToLatLng(gridKey);
  return {
    sw: [center.lat - CELL_LAT / 2, center.lng - CELL_LNG / 2],
    nw: [center.lat + CELL_LAT / 2, center.lng - CELL_LNG / 2],
    ne: [center.lat + CELL_LAT / 2, center.lng + CELL_LNG / 2],
    se: [center.lat - CELL_LAT / 2, center.lng + CELL_LNG / 2],
  };
}

module.exports = {
  latLngToGridKey,
  gridKeyToLatLng,
  coordinatesToGridKeys,
  haversineDistance,
  computeTotalDistance,
  gridKeyToBounds,
  CELL_SIZE_M,
};
