// app/utils/nominatim.ts
//
// Single module-level clock shared by every caller on the page —
// autocomplete and geocoding both import from here, so they share
// one 1 req/s budget and can never race each other.
//
// TODO: If you ever move geocoding back to a server route, replace this
// with a Redis/Upstash counter — module singletons reset on cold starts.

let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1000;

async function throttle(): Promise<void> {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

const NOMINATIM_CONTACT_EMAIL = "contact@yourcompany.com"; // TODO: Replace

export interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
}

/** Geocode a single address. Returns null if nothing was found. */
export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number; state: string | null } | null> {
  await throttle();

  const params = new URLSearchParams({
    q: address,
    format: "json",
    limit: "1",
    addressdetails: "1",
    email: NOMINATIM_CONTACT_EMAIL,
    countrycodes: "us",
  });

  const geocodeUrl = `https://nominatim.openstreetmap.org/search?${params}`;
  const response = await fetch(geocodeUrl);

  if (!response.ok) {
    throw new Error(
      `Nominatim error: ${response.status} ${response.statusText}`,
    );
  }

  const data: NominatimResult[] = await response.json();
  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    state: data[0].address?.state ?? null,
  };
}

// California bounding box: west, north, east, south (lon_min, lat_max, lon_max, lat_min)
const CA_VIEWBOX = "-124.48,42.01,-114.13,32.53";

/** Autocomplete — returns up to `limit` California suggestions. */
export async function autocompleteAddress(
  query: string,
  limit = 10,
): Promise<NominatimResult[]> {
  if (query.length < 3) return [];

  await throttle();

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: String(limit),
    addressdetails: "1",
    countrycodes: "us",
    viewbox: CA_VIEWBOX,
    bounded: "1",
    email: NOMINATIM_CONTACT_EMAIL,
  });

  const autocompleteUrl = `https://nominatim.openstreetmap.org/search?${params}`;
  const response = await fetch(autocompleteUrl);

  if (!response.ok) {
    throw new Error(
      `Nominatim error: ${response.status} ${response.statusText}`,
    );
  }

  const results: NominatimResult[] = await response.json();
  return results.filter((r) => r.address?.state === "California");
}
