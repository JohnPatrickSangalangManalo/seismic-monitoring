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
  selectedYear?: number; // Year filter from parent
  selectedMonth?: number; // Month filter from parent
  onYearChange?: (year: number | undefined) => void;
  onMonthChange?: (month: number | undefined) => void;
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
  newEarthquakeIds,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange
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

  const formatTimeUTC = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
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
              <label htmlFor="filter-select" style={{ fontSize: '0.8rem', color: '#cbd5e1', minWidth: '50px', fontWeight: '600' }}>
                Filter:
              </label>
              <select
                id="filter-select"
                value={filterBy}
                onChange={(e) => onFilterChange(e.target.value as FilterOption)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.08)',
                  backgroundColor: '#1e293b',
                  color: '#f1f5f9',
                  flex: 1,
                  backdropFilter: 'blur(8px)'
                }}
              >
                {selectedYear || selectedMonth ? (
                  <>
                    <option value="all"><i className="bi bi-list-check"></i> All</option>
                  </>
                ) : (
                  <>
                    <option value="all"><i className="bi bi-list-check"></i> All</option>
                    <option value="today"><i className="bi bi-calendar-today"></i> Today</option>
                    <option value="week"><i className="bi bi-calendar-week"></i> This Week</option>
                    <option value="month"><i className="bi bi-calendar-month"></i> This Month</option>
                  </>
                )}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="sort-select" style={{ fontSize: '0.8rem', color: '#cbd5e1', minWidth: '50px', fontWeight: '600' }}>
                Sort:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortOption)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.08)',
                  backgroundColor: '#1e293b',
                  color: '#f1f5f9',
                  flex: 1,
                  backdropFilter: 'blur(8px)'
                }}
              >
                <option value="newest"><i className="bi bi-sort-down"></i> Newest First</option>
                <option value="oldest"><i className="bi bi-sort-up"></i> Oldest First</option>
                <option value="magnitude-high"><i className="bi bi-arrow-down"></i> Highest Magnitude</option>
                <option value="magnitude-low"><i className="bi bi-arrow-up"></i> Lowest Magnitude</option>
              </select>
            </div>
            {/* Year/Month Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
              <label style={{ color: '#cbd5e1', minWidth: '40px', fontWeight: '600' }}>
                <i className="bi bi-calendar" style={{ marginRight: '4px' }}></i>
                Year:
              </label>
              <select
                value={selectedYear || ''}
                onChange={(e) => {
                  const year = e.target.value ? parseInt(e.target.value) : undefined;
                  onYearChange?.(year);
                }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#1e293b',
                  color: '#cbd5e1',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  flex: 1
                }}
              >
                <option value="">Latest</option>
                {[2024, 2023, 2022, 2021, 2020, 2019, 2018].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <label style={{ color: '#cbd5e1', minWidth: '40px', fontWeight: '600' }}>
                <i className="bi bi-calendar3" style={{ marginRight: '4px' }}></i>
                Month:
              </label>
              <select
                value={selectedMonth || ''}
                onChange={(e) => {
                  const month = e.target.value ? parseInt(e.target.value) : undefined;
                  onMonthChange?.(month);
                }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#1e293b',
                  color: '#cbd5e1',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  flex: 1
                }}
              >
                <option value="">All Months</option>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, i) => (
                  <option key={i + 1} value={i + 1}>{month}</option>
                ))}
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
          <p><i className="bi bi-exclamation-triangle" style={{ marginRight: '6px' }}></i>No earthquake data found</p>
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
                    <i className="bi bi-calendar-event" style={{ marginRight: '6px' }}></i>{formatDate(earthquake.time)}
                  </span>
                  <span className="earthquake-time" style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    <i className="bi bi-clock" style={{ marginRight: '6px' }}></i><b>LOCAL TIME:</b> {formatTime(earthquake.time)}
                  </span>
                  <span className="earthquake-time" style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    <i className="bi bi-globe" style={{ marginRight: '6px' }}></i><b>UTC TIME:</b> {formatTimeUTC(earthquake.time)}
                  </span>
                </div>
                {earthquake.depth > 0 && (
                  <span className="earthquake-depth">
                  <i className="bi bi-layers" style={{ marginRight: '6px' }}></i><b>Depth:</b> {earthquake.depth.toFixed(1)} km</span>
                )}
                {(earthquake.latitude !== 0 || earthquake.longitude !== 0) && (
                  <span className="earthquake-coords" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    <i className="bi bi-geo-alt-fill" style={{ marginRight: '6px', color: '#f87171' }}></i>{earthquake.latitude.toFixed(2)}°N, {earthquake.longitude.toFixed(2)}°E
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

