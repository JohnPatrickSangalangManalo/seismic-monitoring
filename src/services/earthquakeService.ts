import axios from 'axios';
import { Earthquake } from '../types/earthquake';

// Backend API endpoint for PHIVOLCS data scraping
// Make sure the backend server is running on port 3001
// In development, Vite proxy will handle /api requests
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001');

export const fetchEarthquakes = async (): Promise<Earthquake[]> => {
  try {
    // Fetch earthquakes from PHIVOLCS via backend scraper
    const response = await axios.get<Earthquake[]>(`${BACKEND_API_URL}/api/earthquakes`, {
      timeout: 60000, // 60 second timeout for scraping
    });

    // Transform the data to match our Earthquake interface
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
    console.error('Error fetching earthquake data from PHIVOLCS:', error);
    
    // Provide helpful error message
    if (axios.isAxiosError(error)) {
      // Connection refused - backend not running
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_CONNECTION_REFUSED') {
        throw new Error('Cannot connect to backend server. Please make sure the backend is running on port 3001. Run "npm run dev" in the backend directory or use start.bat.');
      }
      
      // Network error
      if (error.code === 'ERR_NETWORK' || error.code === 'ENOTFOUND') {
        throw new Error('Network error: Cannot reach the backend server. Please check if the backend is running and your network connection.');
      }
      
      // Timeout error
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Request timeout: The server took too long to respond. The PHIVOLCS website might be slow or unavailable. Please try again.');
      }
      
      // 500 Internal Server Error
      if (error.response?.status === 500) {
        const backendError = error.response?.data?.message || error.response?.data?.error || 'Unknown error';
        throw new Error(`Backend server error: ${backendError}. Check the backend console for more details.`);
      }
      
      // 404 Not Found
      if (error.response?.status === 404) {
        throw new Error('API endpoint not found. Please check if the backend server is configured correctly.');
      }
      
      // Other HTTP errors
      if (error.response) {
        throw new Error(`Server error (${error.response.status}): ${error.response.statusText || 'Unknown error'}`);
      }
    }
    
    // Generic error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch earthquake data: ${errorMessage}. Please try again later.`);
  }
};

