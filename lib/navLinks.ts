// קישורי ניווט (Waze / Google Maps) — universal links: נפתחים באפליקציה אם
// מותקנת, אחרת בדפדפן. משותף ל-NavigateTile ולאירוע ביומן (lib/calendar.ts).
export function wazeUrl(place: string, coords?: { lat: number; lng: number } | null): string {
  return coords
    ? `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(place)}&navigate=yes`;
}

export function googleMapsUrl(place: string, placeId?: string | null): string {
  return (
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` +
    (placeId ? `&query_place_id=${encodeURIComponent(placeId)}` : "")
  );
}
