import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Earthquake } from '../types/earthquake';
import 'leaflet/dist/leaflet.css';
import './EarthquakeMap.css';

type MapStyle = 'openstreetmap' | 'satellite' | 'terrain' | 'dark' | 'light' | 'satellite-streets';

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
  },

  'satellite-streets': {
    name: 'Satellite Streets',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
  },
};


// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icon based on magnitude and whether it's new
const getEarthquakeIcon = (
  magnitude: number,
  isNew: boolean = false
) => {
  const size = Math.min(30 + magnitude * 5, 60);
  const color =
    magnitude >= 6 ? '#dc2626' :
    magnitude >= 5 ? '#ea580c' :
    magnitude >= 4 ? '#eab308' : '#16a34a';

  return L.divIcon({
    className: isNew ? 'custom-earthquake-icon pulsing-marker' : 'custom-earthquake-icon',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background-color: ${color};
        border: 3px solid #fff;
        position: relative;
        overflow: visible;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: white;
        font-size: ${size * 0.4}px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      ">
        ${magnitude.toFixed(1)}
        <span class="pulse-wave"></span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
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
      bottom: '24px',
      right: '24px',
      zIndex: 1000,
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(12px)',
      padding: '10px',
      borderRadius: '10px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap',
      maxWidth: '340px',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      {Object.entries(mapStyles).map(([key, style]) => (
        <button
          key={key}
          onClick={() => onStyleChange(key as MapStyle)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: currentStyle === key ? '1.5px solid #60a5fa' : '1px solid rgba(255,255,255,0.2)',
            backgroundColor: currentStyle === key ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255,255,255,0.05)',
            color: currentStyle === key ? '#60a5fa' : '#cbd5e1',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: currentStyle === key ? '700' : '500',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: currentStyle === key ? 'inset 0 0 12px rgba(96, 165, 250, 0.1)' : 'none'
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
  const previousEarthquakesRef = useRef<Earthquake[]>([]);

  useEffect(() => {
    // Filter out invalid coordinates
    const validEarthquakes = earthquakes.filter(eq => 
      eq.latitude !== 0 && eq.longitude !== 0 &&
      eq.latitude >= -90 && eq.latitude <= 90 &&
      eq.longitude >= -180 && eq.longitude <= 180
    );

    // Check if this is a significant data change (different set of earthquakes)
    const isSignificantChange = 
      previousEarthquakesRef.current.length === 0 ||
      validEarthquakes.length === 0 ||
      (validEarthquakes.length > 0 && previousEarthquakesRef.current.length > 0 &&
       validEarthquakes[0].id !== previousEarthquakesRef.current[0].id);

    // Fit bounds when data changes significantly (new load, filter change, etc.)
    if (validEarthquakes.length > 0 && (isSignificantChange || !selectedEarthquake)) {
      const bounds = L.latLngBounds(
        validEarthquakes.map(eq => [eq.latitude, eq.longitude] as [number, number])
      );
      // Ensure we stay within Philippines bounds
      const southwest = bounds.getSouthWest();
      const northeast = bounds.getNorthEast();
      const constrainedSW = L.latLng(
        Math.max(5.5, southwest.lat),
        Math.max(117.0, southwest.lng)
      );
      const constrainedNE = L.latLng(
        Math.min(19.5, northeast.lat),
        Math.min(127.5, northeast.lng)
      );
      const constrainedBounds = L.latLngBounds(constrainedSW, constrainedNE);
      map.fitBounds(constrainedBounds, { padding: [50, 50], animate: false });
    }

    previousEarthquakesRef.current = validEarthquakes;
  }, [earthquakes, map, selectedEarthquake]);

  // Enforce strict zoom bounds on every zoom event
  useEffect(() => {
    const handleZoom = () => {
      const zoom = map.getZoom();
      if (zoom < 5) {
        map.setZoom(5, { animate: false });
      }
    };

    map.on('zoom', handleZoom);
    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map]);

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
          const zoomOutLevel = Math.max(6, currentZoom - 4); // Zoom out by 2 levels, minimum 4

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
      zIndexOffset={isSelected ? 1000 : 0} // <-- important
      eventHandlers={{
        click: () => onEarthquakeClick(earthquake),
      }}
    >

      <PopupWithZoomOut earthquakes={earthquakes}>
        <div style={{ minWidth: '260px', padding: '6px 0' }}>
          <h3 style={{
            margin: '0 0 10px 0',
            color: '#60a5fa',
            fontSize: '1.15rem',
            fontWeight: '700',
            letterSpacing: '-0.5px',
            marginLeft: '6px'
          }}>
            <i className="bi bi-activity" style={{ marginRight: '6px', fontSize: '1.1rem' }}></i>
            <strong>Magnitude: </strong>
            {earthquake.magnitude.toFixed(1)}
          </h3>
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '10px', marginLeft: '6px', marginRight: '6px' }}>
            <p style={{ margin: '6px 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <i className="bi bi-geo-alt-fill" style={{ marginRight: '6px', color: '#f87171' }}></i>
              <strong style={{ color: '#e0e7ff' }}>Location:</strong> {earthquake.place}
            </p>
            <p style={{ margin: '6px 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <i className="bi bi-clock" style={{ marginRight: '6px', color: '#fbbf24' }}></i>
              <strong style={{ color: '#e0e7ff' }}>Time:</strong> {formatDate(earthquake.time)}
            </p>
            <p style={{ margin: '6px 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <i className="bi bi-layers" style={{ marginRight: '6px', color: '#a78bfa' }}></i>
              <strong style={{ color: '#e0e7ff' }}>Depth:</strong> {earthquake.depth.toFixed(1)} km
            </p>
          </div>
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
        zoom={5}
        minZoom={5}
        maxZoom={14}
        maxBounds={[[0, 114], [25, 135]]}
        maxBoundsViscosity={0.8}
        worldCopyJump={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution={currentMapStyle.attribution}
          url={currentMapStyle.url}
          key={mapStyle}
        />
        <MapUpdater earthquakes={earthquakes} selectedEarthquake={selectedEarthquake} />
        <ZoomToEarthquake selectedEarthquake={selectedEarthquake} />
        {earthquakes
          .filter(eq => {
            // Filter out invalid coordinates (0,0 or out of bounds)
            return eq.latitude !== 0 && eq.longitude !== 0 &&
                   eq.latitude >= -90 && eq.latitude <= 90 &&
                   eq.longitude >= -180 && eq.longitude <= 180;
          })
          .map((earthquake) => {
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

