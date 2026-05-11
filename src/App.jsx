import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import './App.css';

const excelDateToJSDate = (serial) => {
  const epoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(epoch.getTime() + serial * 86400000);
};

const calculateLongestStreak = (data) => {
  if (!data || data.length === 0) return { maxStreak: 0, endDate: null, streakDates: new Set(), allDates: new Set() };
  
  // Extract integers from "Date Worked"
  const dates = data
    .map(row => row['Date Worked'])
    .filter(val => typeof val === 'number') // Ensure it's a number
    .map(val => Math.floor(val));
    
  if (dates.length === 0) return { maxStreak: 0, endDate: null, streakDates: new Set(), allDates: new Set() };
  
  // Remove duplicates and sort ascending
  const uniqueSortedDates = [...new Set(dates)].sort((a, b) => a - b);
  const allDates = new Set(uniqueSortedDates);
  
  let maxStreak = 1;
  let currentStreak = 1;
  let currentStreakStart = uniqueSortedDates[0];
  let maxStreakStart = uniqueSortedDates[0];
  let maxStreakEnd = uniqueSortedDates[0];
  
  for (let i = 1; i < uniqueSortedDates.length; i++) {
    if (uniqueSortedDates[i] === uniqueSortedDates[i - 1] + 1) {
      currentStreak++;
    } else {
      currentStreak = 1;
      currentStreakStart = uniqueSortedDates[i];
    }
    
    // Use >= so if there are ties, the latest streak is highlighted
    if (currentStreak >= maxStreak) {
      maxStreak = currentStreak;
      maxStreakStart = currentStreakStart;
      maxStreakEnd = uniqueSortedDates[i];
    }
  }
  
  const streakDates = new Set();
  for (let d = maxStreakStart; d <= maxStreakEnd; d++) {
    streakDates.add(d);
  }
  
  return { 
    maxStreak, 
    endDate: maxStreakEnd, 
    streakDates, 
    allDates 
  };
};

function Home() {
  const [excelData, setExcelData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enableLoadingScreen, setEnableLoadingScreen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [brutality, setBrutality] = useState(50);

  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(0);
      let progress = 0;
      let timeoutId;

      const updateProgress = () => {
        // Randomly increment by a small or large amount to simulate jagged loading
        let increment = Math.random() < 0.8 ? Math.random() * 4 : Math.random() * 15;
        progress += increment;

        // Cap at 99 until the final 10-second timeout resolves
        if (progress > 99) {
          progress = 99;
        }

        setLoadingProgress(Math.floor(progress));

        // If we hit 99, we just wait. If not, schedule next jump between 100ms and 600ms
        if (progress < 99) {
          timeoutId = setTimeout(updateProgress, Math.random() * 500 + 100);
        }
      };

      // Start the jagged progress
      timeoutId = setTimeout(updateProgress, 200);

      // Force finish after exactly 10 seconds
      const finishTimeout = setTimeout(() => {
        clearTimeout(timeoutId);
        setLoadingProgress(100);
        setIsLoading(false);
      }, 10000);

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(finishTimeout);
      };
    }
  }, [isLoading]);

  const processFile = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      // We grab the very first tab regardless of its exact name
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert that sheet to a JSON array of objects
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      setExcelData(json);
      
      // Trigger the fake loading phase if enabled
      if (enableLoadingScreen) {
        setIsLoading(true);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e) => {
    processFile(e.target.files[0]);
    // Clear the input value so the same file can be uploaded again if needed
    e.target.value = null;
  };

  const handleClear = () => {
    setExcelData(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  if (isLoading) {
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - loadingProgress / 100);

    return (
      <div className="home-container loading-view">
        <div className="progress-circle-container">
          <svg
            className="progress-circle-svg"
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="0.6"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r={radius} stroke="#e0d5c1" />
            <circle 
              cx="12" 
              cy="12" 
              r={radius} 
              stroke="#1f1f1f" 
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
              transform="rotate(-90 12 12)"
            />
          </svg>
          <span className="progress-text">{loadingProgress}%</span>
        </div>
        <div className="loading-text-container">
          <p>loading your personality...</p>
          <div className="slider-container">
            <label htmlFor="brutality">adjust brutality meter</label>
            <input 
              id="brutality"
              type="range" 
              min="0" 
              max="100" 
              value={brutality}
              onChange={(e) => setBrutality(e.target.value)}
              className="brutality-slider"
            />
          </div>
        </div>
      </div>
    );
  }

  // If we have parsed data (and loading is done), render the streak card view
  if (excelData) {
    if (excelData.length === 0) {
      return (
        <div className="home-container">
          <p style={{ fontFamily: '"Patrick Hand", cursive', fontSize: '24px' }}>No data found in the spreadsheet.</p>
          <button onClick={handleClear} className="clear-button">Start Over</button>
        </div>
      );
    }

    const { maxStreak, endDate, streakDates, allDates } = calculateLongestStreak(excelData);

    // Generate exactly 140 days leading up to the endDate for a 20-week grid
    const gridDays = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthLabels = [];

    if (endDate !== null) {
      let currentMonth = -1;
      
      for (let i = 139; i >= 0; i--) {
        const day = endDate - i;
        let status = 'empty';
        if (streakDates.has(day)) {
          status = 'streak';
        } else if (allDates.has(day)) {
          status = 'logged';
        }
        gridDays.push({ day, status });

        // Check the month for the top square of each column
        if (i % 7 === 6) {
          const jsDate = excelDateToJSDate(day);
          const month = jsDate.getUTCMonth();
          if (month !== currentMonth) {
            const colIndex = (139 - i) / 7;
            monthLabels.push({ colIndex, label: monthNames[month] });
            currentMonth = month;
          }
        }
      }
    }

    return (
      <div className="home-container data-view">
        <div className="table-header-bar">
          <button onClick={handleClear} className="clear-button">Start Over</button>
        </div>

        <div className="dashboard-grid">
          {/* Quadrant 2: Top Left */}
          <div className="streak-card empty-card"></div>
          
          {/* Quadrant 1: Top Right */}
          <div className="streak-card empty-card"></div>
          
          {/* Quadrant 3: Bottom Left */}
          <div className="streak-card empty-card"></div>

          {/* Quadrant 4: Bottom Right */}
          <div className="streak-card">
            <span className="streak-text">
              Longest Streak: <span style={{ color: '#D5451B' }}>{maxStreak} Days</span>
            </span>
            
            {endDate !== null && (
              <div className="graph-container">
                <div className="contribution-graph">
                  {gridDays.map((d) => (
                    <div key={d.day} className={`day-square day-${d.status}`}></div>
                  ))}
                </div>
                <div className="month-labels">
                  {monthLabels.map(m => (
                    <span 
                      key={m.colIndex} 
                      className="month-label" 
                      style={{ left: `${m.colIndex * 18}px` }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  // Otherwise, render the default dropzone view
  return (
    <>
      <div 
        className="home-container"
        onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <p>Drop your worklog here!</p>
          </div>
        </div>
      )}

      <label className="upload-button-area">
        <input
          type="file"
          style={{ display: 'none' }}
          accept=".xlsx, .xls, .csv"
          onChange={handleFileUpload}
        />
        <div className="bucket-wrapper">
          <svg
            className="bucket"
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1f1f1f"
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* An empty bucket shape (U shape with an elliptical top rim) */}
            <path d="M4.5 4.5l1.5 15A2 2 0 0 0 8 21.5h8a2 2 0 0 0 2-2l1.5-15" />
            <ellipse cx="12" cy="4.5" rx="7.5" ry="2" />
          </svg>

          <svg
            className="arrow-container"
            width="160"
            height="160"
            viewBox="0 0 160 160"
          >
            <path
              className="arrow-line"
              d="M 140 10 Q 100 10 20 90"
              fill="none"
              stroke="#1f1f1f"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <polygon
              className="arrow-head"
              points="20,90 35.6,84.4 25.6,74.4"
              fill="#1f1f1f"
            />
          </svg>
        </div>

        <div className="upload-text">
          <p>drag your worklog excel anywhere on this page</p>
          <p className="file-formats">.xlsx</p>
        </div>
      </label>
    </div>

    {/* Dev Toggle */}
    <div style={{ position: 'fixed', bottom: '10px', left: '10px', fontSize: '12px', fontFamily: 'monospace', zIndex: 100 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#1f1f1f' }}>
        <input 
          type="checkbox" 
          checked={enableLoadingScreen} 
          onChange={(e) => setEnableLoadingScreen(e.target.checked)}
        />
        Loading screen: {enableLoadingScreen ? 'ON' : 'OFF'}
      </label>
    </div>
    </>
  );
}

function Gallery() {
  return (
    <div className="gallery-container">
      <div className="gallery-track">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((_, index) => (
          <div key={index} className="gallery-card">
            <span className="read-more-text">Click to read more</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="canvas">
        <nav className="navbar">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/gallery" className="nav-link">Gallery</Link>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
