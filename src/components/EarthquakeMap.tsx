import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Earthquake } from '../types/earthquake';
import 'leaflet/dist/leaflet.css';
import './EarthquakeMap.css';

type MapStyle = 'openstreetmap' | 'satellite' | 'terrain' | 'dark' | 'light';

const mapStyles = {
  openstreetmap: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri'
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
  },
  dark: {
    name: 'Dark',
    url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://carto.com">CARTO</a>'
  },
  light: {
    name: 'Light',
    url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://carto.com">CARTO</a>'
  }
};

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icon based on magnitude and whether it's new
const getEarthquakeIcon = (magnitude: number, isNew: boolean = false) => {
  const size = Math.min(30 + magnitude * 5, 60);
  const color = magnitude >= 6 ? '#d32f2f' : magnitude >= 5 ? '#f57c00' : magnitude >= 4 ? '#fbc02d' : '#388e3c';
  
  // For new earthquakes, use a thicker red border and glow effect
  const borderWidth = isNew ? '4px' : '3px';
  const borderColor = isNew ? '#ff0000' : 'white';
  const glowEffect = isNew ? '0 0 20px rgba(255, 0, 0, 0.8), 0 0 30px rgba(255, 0, 0, 0.4)' : '';
  const boxShadow = glowEffect 
    ? `0 2px 8px rgba(0,0,0,0.3), ${glowEffect}`
    : '0 2px 8px rgba(0,0,0,0.3)';
  
  return L.divIcon({
    className: isNew ? 'custom-earthquake-icon pulsing-marker' : 'custom-earthquake-icon',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background-color: ${color};
      border: ${borderWidth} solid ${borderColor};
      box-shadow: ${boxShadow};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${size * 0.4}px;
    ">${magnitude.toFixed(1)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Component to handle map style switching
interface MapStyleSwitcherProps {
  currentStyle: MapStyle;
  onStyleChange: (style: MapStyle) => void;
}

const MapStyleSwitcher = ({ currentStyle, onStyleChange }: MapStyleSwitcherProps) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      backgroundColor: 'white',
      padding: '10px',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      maxWidth: '300px'
    }}>
      {Object.entries(mapStyles).map(([key, style]) => (
        <button
          key={key}
          onClick={() => onStyleChange(key as MapStyle)}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: currentStyle === key ? '2px solid #667eea' : '1px solid #ddd',
            backgroundColor: currentStyle === key ? '#e8eaf6' : 'white',
            color: currentStyle === key ? '#667eea' : '#333',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: currentStyle === key ? '600' : '500',
            transition: 'all 0.2s'
          }}
        >
          {style.name}
        </button>
      ))}
    </div>
  );
};

interface MapUpdaterProps {
  earthquakes: Earthquake[];
  selectedEarthquake: Earthquake | null;
}

const MapUpdater = ({ earthquakes, selectedEarthquake }: MapUpdaterProps) => {
  const map = useMap();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Only fit bounds on initial load, not when earthquakes update
    if (earthquakes.length > 0 && !hasInitializedRef.current && !selectedEarthquake) {
      const bounds = L.latLngBounds(
        earthquakes.map(eq => [eq.latitude, eq.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
      hasInitializedRef.current = true;
    }
  }, [earthquakes, map, selectedEarthquake]);

  return null;
};

interface EarthquakeMapProps {
  earthquakes: Earthquake[];
  selectedEarthquake: Earthquake | null;
  onEarthquakeClick: (earthquake: Earthquake) => void;
  newEarthquakeIds: Set<string>;
}

// Component to handle zoom when earthquake is selected
interface ZoomToEarthquakeProps {
  selectedEarthquake: Earthquake | null;
}

const ZoomToEarthquake = ({ selectedEarthquake }: ZoomToEarthquakeProps) => {
  const map = useMap();
  const previousEarthquakeRef = useRef<Earthquake | null>(null);

  useEffect(() => {
    if (selectedEarthquake) {
      const isSwitching = previousEarthquakeRef.current !== null && 
                          previousEarthquakeRef.current.id !== selectedEarthquake.id;
      
      if (isSwitching) {
        // If switching to a different earthquake, check current zoom level
        const currentZoom = map.getZoom();
        
        // Only zoom out if we're zoomed in (zoom level > 6)
        // If already zoomed out (zoom level <= 6), just pan to the new location
        if (currentZoom > 6) {
          // We're zoomed in, so zoom out first then zoom in
          const zoomOutLevel = Math.max(6, currentZoom - 2); // Zoom out by 2 levels, minimum 4
          
          console.log(`🔄 Switching (zoomed in): Zooming out to level ${zoomOutLevel}, then zooming in to level 8`);
          
          // Zoom out first
          map.setView(
            [selectedEarthquake.latitude, selectedEarthquake.longitude],
            zoomOutLevel,
            { animate: true }
          );
          
          // Then zoom in after zoom out completes
          setTimeout(() => {
            map.setView(
              [selectedEarthquake.latitude, selectedEarthquake.longitude],
              8, // Final zoom level
              { animate: true }
            );
          }, 600); // Wait 600ms for zoom out to complete
        } else {
          // Already zoomed out, just pan to the new location and zoom in
          console.log(`🔄 Switching (already zoomed out): Panning to new location and zooming in to level 8`);
          map.setView(
            [selectedEarthquake.latitude, selectedEarthquake.longitude],
            8,
            { animate: true }
          );
        }
      } else {
        // First selection - just zoom in directly
        console.log(`📍 First selection: Zooming in to level 8`);
        map.setView(
          [selectedEarthquake.latitude, selectedEarthquake.longitude],
          8,
          { animate: true }
        );
      }
      
      // Update previous earthquake reference
      previousEarthquakeRef.current = selectedEarthquake;
    }
  }, [selectedEarthquake, map]);

  return null;
};

// Component to handle zoom out when popup is closed
interface PopupWithZoomOutProps {
  children: React.ReactNode;
  earthquakes: Earthquake[];
}

const PopupWithZoomOut = ({ children, earthquakes }: PopupWithZoomOutProps) => {
  const map = useMap();

  const handlePopupClose = () => {
    // Zoom out to show all earthquakes when popup is closed
    if (earthquakes.length > 0) {
      const bounds = L.latLngBounds(
        earthquakes.map(eq => [eq.latitude, eq.longitude] as [number, number])
      );
      map.fitBounds(bounds, { 
        padding: [50, 50],
        animate: true
      });
      console.log('🔍 Popup closed: Zooming out to show all earthquakes');
    } else {
      // If no earthquakes, zoom to default view
      map.setView([12.8797, 121.7740], 6, { animate: true });
    }
  };

  return (
    <Popup 
      eventHandlers={{
        remove: handlePopupClose
      }}
    >
      {children}
    </Popup>
  );
};

// Component to handle opening popup when earthquake is selected
interface MarkerWithPopupProps {
  earthquake: Earthquake;
  isNew: boolean;
  isSelected: boolean;
  earthquakes: Earthquake[];
  onEarthquakeClick: (earthquake: Earthquake) => void;
  formatDate: (timestamp: number) => string;
}

const MarkerWithPopup = ({ 
  earthquake, 
  isNew, 
  isSelected, 
  earthquakes, 
  onEarthquakeClick,
  formatDate 
}: MarkerWithPopupProps) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    // Open popup when this earthquake is selected
    if (isSelected && markerRef.current) {
      setTimeout(() => {
        if (markerRef.current) {
          markerRef.current.openPopup();
        }
      }, 800); // Wait for zoom animation to complete
    }
  }, [isSelected]);

  return (
    <Marker
      ref={markerRef}
      position={[earthquake.latitude, earthquake.longitude]}
      icon={getEarthquakeIcon(earthquake.magnitude, isNew)}
      eventHandlers={{
        click: () => onEarthquakeClick(earthquake),
      }}
    >
      <PopupWithZoomOut earthquakes={earthquakes}>
        <div style={{ minWidth: '200px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
            Magnitude {earthquake.magnitude.toFixed(1)}
          </h3>
          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#666' }}>
            <strong>Location:</strong> {earthquake.place}
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#666' }}>
            <strong>Time:</strong> {formatDate(earthquake.time)}
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#666' }}>
            <strong>Depth:</strong> {earthquake.depth.toFixed(1)} km
          </p>
        </div>
      </PopupWithZoomOut>
    </Marker>
  );
};

const EarthquakeMap = ({ earthquakes, selectedEarthquake, onEarthquakeClick, newEarthquakeIds }: EarthquakeMapProps) => {
  const [mapStyle, setMapStyle] = useState<MapStyle>('openstreetmap');
  const currentMapStyle = mapStyles[mapStyle];

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={[12.8797, 121.7740]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution={currentMapStyle.attribution}
          url={currentMapStyle.url}
          key={mapStyle}
        />
        <MapUpdater earthquakes={earthquakes} selectedEarthquake={selectedEarthquake} />
        <ZoomToEarthquake selectedEarthquake={selectedEarthquake} />
        {earthquakes.map((earthquake) => {
          const isNew = newEarthquakeIds.has(earthquake.id);
          const isSelected = selectedEarthquake?.id === earthquake.id;
          return (
            <MarkerWithPopup
              key={earthquake.id}
              earthquake={earthquake}
              isNew={isNew}
              isSelected={isSelected}
              earthquakes={earthquakes}
              onEarthquakeClick={onEarthquakeClick}
              formatDate={formatDate}
            />
          );
        })}
      </MapContainer>
      <MapStyleSwitcher currentStyle={mapStyle} onStyleChange={setMapStyle} />
    </div>
  );
};

export default EarthquakeMap;

