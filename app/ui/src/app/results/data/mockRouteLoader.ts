// Defining the input shape (mock JSON file)
// Then converting it into the output shape defined in types.ts (full Route and Stop objects) so the rest of the app can use it

import type { Route, Stop } from "../types";

export interface MockRouteStop {
  // Defining the shape of a single stop in the mock route
  id: string;
  lat: number;
  lng: number;
  address: string;
  status: string;
  sequence: number;
  addresseeName?: string;
  phoneNumber?: string;
  timeWindow?: string;
  note?: string;
}

export interface MockRouteJson {
  // Defining shape of mock_route.json file
  stops: MockRouteStop[];
}

export function mockRouteToRoute(data: MockRouteJson): Route {
  // Converting the mock route data into a Route object with stops
  const stops: Stop[] = data.stops.map((s) => ({
    id: s.id,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    sequence: s.sequence,
    capacityUsed: 1,
    timeWindow: {
      kind: "at" as const,
      time: s.timeWindow?.trim() || "12:00",
    },
    note: s.note ?? "",
    addresseeName: s.addresseeName,
    phoneNumber: s.phoneNumber,
  }));
  return {
    vehicleId: "mock-vehicle-1",
    driverName: "Joe",
    stops,
    vehicleType: "Van",
    distanceMi: 89,
    estimatedTimeMinutes: 195, // 3h 15m
  };
}
