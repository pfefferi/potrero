// Continuous GPS tracking — returns a ref-like object
// { current: { lat, lng, ts }, watchId, active }
let _current = null;
let _watchId = null;
let _listeners = new Set();

function startTracking(interval = 10000) {
  if (_watchId !== null || !navigator.geolocation) return;
  _watchId = navigator.geolocation.watchPosition(
    (pos) => {
      _current = {
        lat: pos.coords.latitude.toFixed(6),
        lng: pos.coords.longitude.toFixed(6),
        ts: pos.timestamp || Date.now(),
      };
      _listeners.forEach(fn => fn(_current));
    },
    () => {}, // ignore errors silently
    { enableHighAccuracy: false, timeout: 15000, maximumAge: interval }
  );
}

function stopTracking() {
  if (_watchId !== null) {
    navigator.geolocation.clearWatch(_watchId);
    _watchId = null;
  }
}

function subscribe(fn) {
  _listeners.add(fn);
  if (_current) fn(_current);
  return () => _listeners.delete(fn);
}

function getLatest() {
  return _current;
}

export const gpsTrack = { startTracking, stopTracking, subscribe, getLatest };

