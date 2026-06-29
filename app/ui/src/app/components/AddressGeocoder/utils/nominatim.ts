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

const AUTOCOMPLETE_DISPLAY_LIMIT = 4;

// California bounding box — tells Nominatim to prefer results inside this area.
// Format: left (min_lon), top (max_lat), right (max_lon), bottom (min_lat)
const CA_VIEWBOX = "-124.5,42.0,-114.1,32.5";

/** Autocomplete — returns up to 4 California suggestions. */
export async function autocompleteAddress(
  query: string,
): Promise<NominatimResult[]> {
  if (query.length < 3) return [];

  await throttle();

  // Appending ", California" steers Nominatim's ranking toward CA results.
  // viewbox + bounded=1 hard-limits results to the CA bounding box so we get
  // multiple distinct suggestions instead of a single best-match geocode.
  const params = new URLSearchParams({
    q: `${query}, California`,
    format: "json",
    limit: String(AUTOCOMPLETE_DISPLAY_LIMIT * 3),
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
  return results
    .filter((r) => r.address?.state === "California")
    .slice(0, AUTOCOMPLETE_DISPLAY_LIMIT);
}
