import axios from 'axios';
import { Earthquake } from '../types/earthquake';

// Use the Vercel API endpoint (/api/earthquakes)
// In development, Vite proxy will handle /api requests to localhost:3001
// In production, it will use the same domain as the frontend
const BACKEND_API_URL = '/api';

export const fetchEarthquakes = async (): Promise<Earthquake[]> => {
  try {
    console.log('📡 Fetching earthquakes from /api/earthquakes...');
    const response = await axios.get<Earthquake[]>(`${BACKEND_API_URL}/earthquakes`, {
      timeout: 60000,
    });

    return response.data.map((eq) => ({
      id: eq.id,
      magnitude: eq.magnitude,
      place: eq.place,
      time: eq.time,
      longitude: eq.longitude,
      latitude: eq.latitude,
      depth: eq.depth,
      url: eq.url || '',
      detail: eq.detail || '',
    }));
  } catch (error) {
    console.error('Error fetching earthquake data:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_CONNECTION_REFUSED') {
        throw new Error('Cannot connect to API server. Please make sure the backend is running.');
      }
      
      if (error.code === 'ERR_NETWORK' || error.code === 'ENOTFOUND') {
        throw new Error('Network error: Cannot reach the API server.');
      }
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timeout: The server took too long to respond. Please try again.');
      }
      
      if (error.response?.status === 500) {
        const backendError = error.response?.data?.message || 'Server error';
        throw new Error(`API Error: ${backendError}`);
      }
      
      if (error.response?.status === 404) {
        throw new Error('API endpoint not found.');
      }
      
      if (error.response) {
        throw new Error(`Server error (${error.response.status}): ${error.response.statusText}`);
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch earthquake data: ${errorMessage}`);
  }
};

