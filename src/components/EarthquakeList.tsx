import { Earthquake } from '../types/earthquake';
import './EarthquakeList.css';

type SortOption = 'newest' | 'oldest' | 'magnitude-high' | 'magnitude-low';
type FilterOption = 'all' | 'today' | 'week' | 'month' | 'year';

interface EarthquakeListProps {
  earthquakes: Earthquake[]; // Already filtered and sorted
  allEarthquakes: Earthquake[]; // All earthquakes for count display
  selectedEarthquake: Earthquake | null;
  onEarthquakeClick: (earthquake: Earthquake) => void;
  sortBy: SortOption;
  filterBy: FilterOption;
  onSortChange: (sort: SortOption) => void;
  onFilterChange: (filter: FilterOption) => void;
  newEarthquakeIds: Set<string>; // IDs of newly added earthquakes
}

const EarthquakeList = ({ 
  earthquakes, 
  allEarthquakes,
  selectedEarthquake, 
  onEarthquakeClick,
  sortBy,
  filterBy,
  onSortChange,
  onFilterChange,
  newEarthquakeIds
}: EarthquakeListProps) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude >= 6) return '#d32f2f';
    if (magnitude >= 5) return '#f57c00';
    if (magnitude >= 4) return '#fbc02d';
    return '#388e3c';
  };

  // earthquakes prop is already filtered and sorted from App.tsx
  const sortedEarthquakes = earthquakes;

  return (
    <div className="earthquake-list">
      {allEarthquakes.length > 0 && (
        <div className="sort-controls">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="filter-select" style={{ fontSize: '0.9rem', color: '#666', minWidth: '80px' }}>
                Filter:
              </label>
              <select
                id="filter-select"
                value={filterBy}
                onChange={(e) => onFilterChange(e.target.value as FilterOption)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  background: 'white',
                  color: '#333',
                  flex: 1
                }}
              >
                <option value="all">📋 All</option>
                <option value="today">📅 Today Only</option>
                <option value="week">📅 This Week</option>
                <option value="month">📅 This Month</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="sort-select" style={{ fontSize: '0.9rem', color: '#666', minWidth: '80px' }}>
                Sort:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortOption)}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  background: 'white',
                  color: '#333',
                  flex: 1
                }}
              >
                <option value="newest">📅 Newest First</option>
                <option value="oldest">📅 Oldest First</option>
                <option value="magnitude-high">📊 Highest Magnitude</option>
                <option value="magnitude-low">📊 Lowest Magnitude</option>
              </select>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', paddingTop: '0.25rem', borderTop: '1px solid #e0e0e0' }}>
              Showing {sortedEarthquakes.length} of {allEarthquakes.length} earthquake{sortedEarthquakes.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}
      {sortedEarthquakes.length === 0 ? (
        <div className="empty-state">
          <p>⚠️ No earthquake data found</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#999' }}>
            The PHIVOLCS website structure may have changed, or there are no recent earthquakes to display.
          </p>
        </div>
      ) : (
        sortedEarthquakes.map((earthquake) => {
          const isNew = newEarthquakeIds.has(earthquake.id);
          return (
          <div
            key={earthquake.id}
            className={`earthquake-item ${selectedEarthquake?.id === earthquake.id ? 'selected' : ''} ${isNew ? 'new-earthquake' : ''}`}
            onClick={() => onEarthquakeClick(earthquake)}
          >
            <div className="earthquake-magnitude" style={{ backgroundColor: getMagnitudeColor(earthquake.magnitude) }}>
              {earthquake.magnitude.toFixed(1)}
            </div>
            <div className="earthquake-details">
              <h3 className="earthquake-place">{earthquake.place}</h3>
              <div className="earthquake-meta">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span className="earthquake-time">
                    📅 {formatDate(earthquake.time)}
                  </span>
                  <span className="earthquake-time" style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    🕐 {formatTime(earthquake.time)}
                  </span>
                </div>
                {earthquake.depth > 0 && (
                  <span className="earthquake-depth">Depth: {earthquake.depth.toFixed(1)} km</span>
                )}
                {(earthquake.latitude !== 0 || earthquake.longitude !== 0) && (
                  <span className="earthquake-coords" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    📍 {earthquake.latitude.toFixed(2)}°N, {earthquake.longitude.toFixed(2)}°E
                  </span>
                )}
              </div>
            </div>
          </div>
          );
        })
      )}
    </div>
  );
};

export default EarthquakeList;

