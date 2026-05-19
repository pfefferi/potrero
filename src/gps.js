// Quick GPS capture — returns { lat, lng } or null if unavailable
export async function getGPS(timeout = 8000) {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout, maximumAge: 60000 }
    );
  });
}
