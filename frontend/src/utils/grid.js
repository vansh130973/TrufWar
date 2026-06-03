export const CELL_SIZE_M = 50;

export function latLngToGridKey(lat, lng) {
  const latCells = Math.floor((lat * 111000) / CELL_SIZE_M);
  const lngCells = Math.floor((lng * Math.cos((lat * Math.PI) / 180) * 111000) / CELL_SIZE_M);
  return `${latCells}_${lngCells}`;
}

export function gridKeyToLatLng(gridKey) {
  const [latCells, lngCells] = gridKey.split('_').map(Number);
  const lat = ((latCells + 0.5) * CELL_SIZE_M) / 111000;
  const lng = ((lngCells + 0.5) * CELL_SIZE_M) / (111000 * Math.cos((lat * Math.PI) / 180));
  return { lat, lng };
}

export function getCellBounds(lat, lng) {
  const CELL_LAT = CELL_SIZE_M / 111000;
  const CELL_LNG = CELL_SIZE_M / (111000 * Math.cos((lat * Math.PI) / 180));
  return [
    [lat - CELL_LAT / 2, lng - CELL_LNG / 2],
    [lat - CELL_LAT / 2, lng + CELL_LNG / 2],
    [lat + CELL_LAT / 2, lng + CELL_LNG / 2],
    [lat + CELL_LAT / 2, lng - CELL_LNG / 2],
  ];
}

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatPace(meters, seconds) {
  if (!meters || meters < 10) return '--:--';
  const secsPerKm = (seconds / meters) * 1000;
  const paceMin = Math.floor(secsPerKm / 60);
  const paceSec = Math.floor(secsPerKm % 60);
  return `${paceMin}:${String(paceSec).padStart(2, '0')}`;
}
