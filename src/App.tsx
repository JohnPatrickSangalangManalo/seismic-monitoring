import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './App.css';
import EarthquakeMap from './components/EarthquakeMap';
import EarthquakeList from './components/EarthquakeList';
import { Earthquake } from './types/earthquake';
import { fetchEarthquakes } from './services/earthquakeService';

type SortOption = 'newest' | 'oldest' | 'magnitude-high' | 'magnitude-low';
type FilterOption = 'all' | 'today' | 'week' | 'month' | 'year';

function App() {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [selectedEarthquake, setSelectedEarthquake] = useState<Earthquake | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newEarthquakesCount, setNewEarthquakesCount] = useState(0);
  const [newEarthquakeIds, setNewEarthquakeIds] = useState<Set<string>>(new Set());
  const refreshingRef = useRef(false); // Prevent concurrent refreshes

  const loadEarthquakes = useCallback(async (silent = false) => {
    // Prevent concurrent refreshes
    if (refreshingRef.current) {
      console.log('⏸️ Refresh already in progress, skipping...');
      return;
    }

    refreshingRef.current = true;
    if (!silent) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    try {
      const data = await fetchEarthquakes();

      // Remove duplicates based on id, time, and coordinates
      const uniqueData = data.filter((eq, index, self) =>
        index === self.findIndex(e =>
          e.id === eq.id ||
          (Math.abs(e.time - eq.time) < 60000 && // Same time (within 1 minute)
            Math.abs(e.latitude - eq.latitude) < 0.01 && // Same location
            Math.abs(e.longitude - eq.longitude) < 0.01)
        )
      );

      // Check for new earthquakes using functional update
      setEarthquakes((prevEarthquakes) => {
        if (prevEarthquakes.length > 0 && !silent) {
          // Compare earthquakes by their actual properties (time, location, magnitude)
          // not just ID, since IDs are regenerated on each scrape
          const newEarthquakes = uniqueData.filter(newEq => {
            // Check if this earthquake already exists in previous data
            const isExisting = prevEarthquakes.some(oldEq => {
              // Same time (within 1 minute tolerance)
              const sameTime = Math.abs(oldEq.time - newEq.time) < 60000;
              // Same location (within 0.01 degree tolerance)
              const sameLocation = Math.abs(oldEq.latitude - newEq.latitude) < 0.01 &&
                Math.abs(oldEq.longitude - newEq.longitude) < 0.01;
              // Same magnitude (within 0.1 tolerance)
              const sameMagnitude = Math.abs(oldEq.magnitude - newEq.magnitude) < 0.1;

              return sameTime && sameLocation && sameMagnitude;
            });

            return !isExisting;
          });

          const newCount = newEarthquakes.length;

          if (newCount > 0) {
            // Track new earthquake IDs
            const newIds = new Set(newEarthquakes.map(eq => eq.id));
            setNewEarthquakeIds(newIds);
            setNewEarthquakesCount(newCount);

            // Remove highlight after 10 seconds
            setTimeout(() => {
              setNewEarthquakeIds(prev => {
                const updated = new Set(prev);
                newIds.forEach(id => updated.delete(id));
                return updated;
              });
            }, 10000);

            // Hide notification after 5 seconds
            setTimeout(() => setNewEarthquakesCount(0), 5000);
          } else {
            // Clear any existing highlights if no new earthquakes
            setNewEarthquakeIds(new Set());
            setNewEarthquakesCount(0);
          }
        } else if (prevEarthquakes.length === 0) {
          // First load - clear any existing highlights
          setNewEarthquakeIds(new Set());
          setNewEarthquakesCount(0);
        }
        return uniqueData;
      });

      if (uniqueData.length > 0) {
        setSelectedEarthquake((prevSelected) => {
          // Only auto-select if no earthquake is selected or selected one is not in new data
          if (!prevSelected || !uniqueData.find(eq => eq.id === prevSelected.id)) {
            return uniqueData[0];
          }
          return prevSelected;
        });
      } else {
        setSelectedEarthquake(null);
      }
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load earthquake data');
      setEarthquakes([]);
      setSelectedEarthquake(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      refreshingRef.current = false;
    }
  }, []); // Empty deps - using state setters which are stable

  // Initial load on mount only
  useEffect(() => {
    loadEarthquakes(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Auto-refresh every 5 minutes (only when autoRefresh is enabled)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadEarthquakes(true); // Silent refresh
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]); // Only depend on autoRefresh, loadEarthquakes is stable

  const handleEarthquakeClick = (earthquake: Earthquake) => {
    setSelectedEarthquake(earthquake);
  };

  // Filter earthquakes by time period
  const filteredEarthquakes = useMemo(() => {
    return earthquakes.filter((eq) => {
      const earthquakeDate = new Date(eq.time);
      const now = new Date();

      switch (filterBy) {
        case 'today': {
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return earthquakeDate >= todayStart;
        }
        case 'week': {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return earthquakeDate >= weekAgo;
        }
        case 'month': {
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return earthquakeDate >= monthAgo;
        }
        case 'year': {
          const yearAgo = new Date(now);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          return earthquakeDate >= yearAgo;
        }
        case 'all':
        default:
          return true;
      }
    });
  }, [earthquakes, filterBy]);

  // Sort earthquakes based on selected option
  const filteredSortedEarthquakes = useMemo(() => {
    return [...filteredEarthquakes].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.time - a.time;
        case 'oldest':
          return a.time - b.time;
        case 'magnitude-high':
          return b.magnitude - a.magnitude;
        case 'magnitude-low':
          return a.magnitude - b.magnitude;
        default:
          return b.time - a.time;
      }
    });
  }, [filteredEarthquakes, sortBy]);

  // Update selected earthquake when filter/sort changes
  useEffect(() => {
    if (filteredSortedEarthquakes.length > 0 &&
      (!selectedEarthquake || !filteredSortedEarthquakes.find(eq => eq.id === selectedEarthquake.id))) {
      setSelectedEarthquake(filteredSortedEarthquakes[0]);
    } else if (filteredSortedEarthquakes.length === 0) {
      setSelectedEarthquake(null);
    }
  }, [filteredSortedEarthquakes]);

  return (
    <div className="app">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1>🌍 SEISMIC WATCHER - Earthquake Tracker</h1>
            <p>Real-time earthquake monitoring in the Philippines region</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>🔄 Auto-refresh (5 min)</span>
              </label>
            </div>
            {lastRefresh && (
              <div style={{ fontSize: '0.85rem', color: '#111' }}>
                {isRefreshing ? (
                  <span>🔄 Refreshing...</span>
                ) : (
                  <span>
                    Last: {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
            {newEarthquakesCount > 0 && (
              <div style={{
                fontSize: '0.9rem',
                color: '#fff',
                backgroundColor: '#d32f2f',
                fontWeight: 'bold',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(211, 47, 47, 0.4)',
                animation: 'pulse 2s infinite'
              }}>
                ⚠️ WARNING: {newEarthquakesCount} new earthquake{newEarthquakesCount !== 1 ? 's' : ''} detected!
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="main-content">
        <div className="map-container">
          {loading ? (
            <div className="loading">Loading earthquake data...</div>
          ) : error ? (
            <div className="error">
              <p>{error}</p>
              <button onClick={() => loadEarthquakes(false)}>Try Again</button>
            </div>
          ) : earthquakes.length === 0 ? (
            <div
              className="loading"
              style={{
                marginTop: '23rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '4px' // adjust kung gaano kataas ang container
              }}
            >
              <p>No earthquake data available</p>

              <button
                onClick={() => loadEarthquakes(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🔄 Try Again
              </button>
            </div>

          ) : (
            <>
              <button className="refresh-btn" onClick={() => loadEarthquakes(false)}>
                🔄 Refresh Data
              </button>
              <EarthquakeMap
                earthquakes={filteredSortedEarthquakes}
                selectedEarthquake={selectedEarthquake}
                onEarthquakeClick={handleEarthquakeClick}
                newEarthquakeIds={newEarthquakeIds}
              />
            </>
          )}
        </div>
        <div className="list-container">
          <div className="list-header">
            <h2>Recent Earthquakes</h2>
            <p>
              {filteredSortedEarthquakes.length} of {earthquakes.length} earthquake{earthquakes.length !== 1 ? 's' : ''} shown
            </p>
          </div>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : error ? (
            <div className="error">
              <p>{error}</p>
            </div>
          ) : (
            <EarthquakeList
              earthquakes={filteredSortedEarthquakes}
              allEarthquakes={earthquakes}
              selectedEarthquake={selectedEarthquake}
              onEarthquakeClick={handleEarthquakeClick}
              sortBy={sortBy}
              filterBy={filterBy}
              onSortChange={setSortBy}
              onFilterChange={setFilterBy}
              newEarthquakeIds={newEarthquakeIds}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

