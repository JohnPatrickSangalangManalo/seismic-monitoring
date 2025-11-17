export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  longitude: number;
  latitude: number;
  depth: number;
  url: string;
  detail: string;
}

export interface EarthquakeData {
  features: Array<{
    id: string;
    properties: {
      mag: number;
      place: string;
      time: number;
      url: string;
      detail: string;
    };
    geometry: {
      type: string;
      coordinates: [number, number, number]; // [longitude, latitude, depth]
    };
  }>;
}

