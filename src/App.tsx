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
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const refreshingRef = useRef(false); // Prevent concurrent refreshes

  const loadEarthquakes = useCallback(async (silent = false, year?: number, month?: number) => {
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
      const data = await fetchEarthquakes(year ?? selectedYear, month ?? selectedMonth);

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
      // Only mark as new if this is a silent refresh (auto-refresh), not when loading new data
      setEarthquakes((prevEarthquakes) => {
        if (prevEarthquakes.length > 0 && !silent && !year && !month) {
          // Only check for new earthquakes during auto-refresh, not when loading filtered data
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
        } else {
          // First load or filtered load - clear any existing highlights
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
  }, [selectedYear, selectedMonth]); // Include year/month dependencies

  // Initial load on mount only
  useEffect(() => {
    loadEarthquakes(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Auto-fill month when year is selected, or year when month is selected
  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
    
    // If year is selected but no month, auto-select current month
    if (selectedYear && !selectedMonth) {
      setSelectedMonth(currentMonth);
    }
    // If month is selected but no year, auto-select current year
    if (selectedMonth && !selectedYear) {
      setSelectedYear(currentYear);
    }
  }, [selectedYear, selectedMonth]);

  // Load earthquakes when year/month filter changes - with debouncing to prevent lag
  useEffect(() => {
    // Clear new earthquake highlights when filters change
    setNewEarthquakeIds(new Set());
    setNewEarthquakesCount(0);
    
    // Debounce the loading to prevent lag when rapidly changing filters
    const timeoutId = setTimeout(() => {
      // Only load if both year and month are selected (for historical data)
      // or if both are cleared (for latest data)
      if ((selectedYear && selectedMonth) || (!selectedYear && !selectedMonth)) {
        loadEarthquakes(false, selectedYear, selectedMonth);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth]); // Reload when filters change

  // Auto-refresh every 5 minutes (only when autoRefresh is enabled)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadEarthquakes(true); // Silent refresh
    }, 1 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]); // Only depend on autoRefresh, loadEarthquakes is stable

  // This is now handled in the year/month change effect above

  const handleEarthquakeClick = (earthquake: Earthquake) => {
    setSelectedEarthquake(earthquake);
  };

  // Filter earthquakes by time period
  // Skip filterBy if year/month is selected (backend already filtered)
  const filteredEarthquakes = useMemo(() => {
    // If year/month is selected, backend already filtered, so just return all
    if (selectedYear || selectedMonth) {
      return earthquakes;
    }

    // Otherwise, apply frontend filter
    return earthquakes.filter((eq) => {
      const earthquakeDate = new Date(eq.time);
      const now = new Date();

      switch (filterBy) {
        case 'today': {
          // Check if earthquake happened today by comparing calendar dates
          // This is more robust than time-based comparison and handles timezone issues
          const eqYear = earthquakeDate.getFullYear();
          const eqMonth = earthquakeDate.getMonth();
          const eqDate = earthquakeDate.getDate();
          const nowYear = now.getFullYear();
          const nowMonth = now.getMonth();
          const nowDate = now.getDate();
          
          // Also check if it's within the last 24 hours as a fallback
          const hoursDiff = (now.getTime() - earthquakeDate.getTime()) / (1000 * 60 * 60);
          const isWithin24Hours = hoursDiff >= 0 && hoursDiff <= 24;
          
          // Earthquake is "today" if it's the same calendar day OR within last 24 hours
          const isToday = (eqYear === nowYear && eqMonth === nowMonth && eqDate === nowDate) || isWithin24Hours;
          
          return isToday;
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
  }, [earthquakes, filterBy, selectedYear, selectedMonth]);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img 
              src="/seismic-badge.svg" 
              alt="Seismic Watcher Badge" 
              style={{ width: '48px', height: '48px', filter: 'drop-shadow(0 0 12px rgba(96, 165, 250, 0.6))' }}
            />
            <div>
              <h1>SEISMIC WATCHER - Earthquake Tracker</h1>
              <p>Real-time earthquake monitoring in the Philippines region</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>
                <i className="bi bi-arrow-clockwise"></i> Auto-refresh (1 min)</span>
              </label>
            </div>
            {lastRefresh && (
              <div style={{ fontSize: '0.85rem', color: 'Gray' }}>
                {isRefreshing ? (
                  <span>
                <i className="bi bi-arrow-clockwise"></i> Refreshing...</span>
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
                <i className="bi bi-bootstrap-reload"></i> Try Again
              </button>
            </div>

          ) : (
            <>
              <button className="refresh-btn" onClick={() => loadEarthquakes(false)}>
              <i className="bi bi-bootstrap-reboot"></i> Refresh Data

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
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onYearChange={setSelectedYear}
              onMonthChange={setSelectedMonth}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

