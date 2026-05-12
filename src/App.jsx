import React, { useState, useEffect, useRef } from 'react';
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

function AutoScaleText({ text, color = '#1f1f1f' }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(28);
  const [isScaled, setIsScaled] = useState(false);

  useEffect(() => {
    setFontSize(28);
    setIsScaled(false);
  }, [text]);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (container && textEl && !isScaled) {
      if (
        (textEl.scrollHeight > container.clientHeight ||
          textEl.scrollWidth > container.clientWidth) &&
        fontSize > 12
      ) {
        setFontSize((prev) => prev - 1);
      } else {
        setIsScaled(true);
      }
    }
  }, [fontSize, isScaled, text]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p ref={textRef} style={{ 
        fontSize: `${fontSize}px`, 
        margin: 0, 
        textAlign: 'center', 
        fontFamily: '"Patrick Hand", cursive', 
        color: color, 
        lineHeight: 1.2,
        opacity: isScaled ? 1 : 0
      }}>
        {text.split('').map((char, i) => (
          <span 
            key={i} 
            style={{ 
              opacity: 0, 
              animation: isScaled ? `typeWriterReveal 0.1s forwards ${(i / text.length) * 1.5}s` : 'none'
            }}
          >
            {char}
          </span>
        ))}
      </p>
    </div>
  );
}

function Home() {
  const [excelData, setExcelData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enableLoadingScreen, setEnableLoadingScreen] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [brutality, setBrutality] = useState(15);
  const [aiData, setAiData] = useState(null);
  const targetRanking = aiData?.workEthicRanking || 0;
  const [rankingPercent, setRankingPercent] = useState(0);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardName, setCardName] = useState('');

  useEffect(() => {
    if (aiData) {
      const t = setTimeout(() => {
        setRankingPercent(targetRanking);
      }, 100);
      return () => clearTimeout(t);
    } else {
      setRankingPercent(0);
    }
  }, [aiData, targetRanking]);

  const aiDataRef = useRef(null);
  useEffect(() => { aiDataRef.current = aiData; }, [aiData]);

  const canvasRef = useRef(null);
  const isDrawingOnCard = useRef(false);
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleCardMouseDown = (e) => {
    if (e.target.tagName === 'INPUT') return;
    isDrawingOnCard.current = true;
    const pos = getCanvasPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
  };

  const handleCardMouseMove = (e) => {
    if (!isDrawingOnCard.current || !canvasRef.current) return;
    const pos = getCanvasPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const handleCardMouseUp = () => { isDrawingOnCard.current = false; };

  const handleCardSubmit = () => {
    const canvas = canvasRef.current;
    const signatureDataUrl = canvas ? canvas.toDataURL() : '';
    const { maxStreak, endDate, streakDates, allDates } = calculateLongestStreak(excelData);
    const existing = JSON.parse(localStorage.getItem('galleryEntries') || '[]');
    const newEntry = {
      id: Date.now(),
      name: cardName.trim() || 'Anonymous',
      issuedDate: today,
      cardNumber: String(existing.length + 1).padStart(4, '0'),
      signatureDataUrl,
      aiData,
      streak: {
        maxStreak,
        endDate,
        streakDates: [...streakDates],
        allDates: [...allDates],
      },
    };
    localStorage.setItem('galleryEntries', JSON.stringify([...existing, newEntry]));
    setShowCardModal(false);
    setCardName('');
  };

  useEffect(() => {
    if (isLoading && enableLoadingScreen) {
      setLoadingProgress(0);
      let progress = 0;
      let timeoutId;
      const startTime = Date.now();
      const TOTAL_TIME = 10000; // Exactly 10 seconds

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const currentAiData = aiDataRef.current;

        // If 10 seconds have passed AND we have AI data (or at 12s regardless), finish
        if (elapsed >= TOTAL_TIME && currentAiData) {
          setLoadingProgress(100);
          setTimeout(() => setIsLoading(false), 500);
          return;
        }
        // Hard cap: stop at 12s even without AI data
        if (elapsed >= 12000) {
          setLoadingProgress(100);
          setTimeout(() => setIsLoading(false), 500);
          return;
        }

        // Randomize the delay to the next update
        const isLongHang = Math.random() < 0.2; // 20% chance to freeze
        const nextDelay = isLongHang ? (Math.random() * 1000 + 800) : (Math.random() * 300 + 100);

        // Figure out where the progress roughly "should" be based on time
        const timeRatio = Math.min((elapsed + nextDelay) / TOTAL_TIME, 1);
        
        // Non-linear curve: starts a bit faster, slows down
        let idealProgress = Math.pow(timeRatio, 0.8) * 100;
        
        // Random jitter so it's not a smooth line
        let nextTarget = idealProgress + (Math.random() * 15 - 5);

        // Ensure it always goes forward a tiny bit
        if (nextTarget <= progress) {
          nextTarget = progress + (Math.random() * 2 + 0.1);
        }
        // Never reach 100 on its own — only the completion check above can set 100
        progress = Math.min(nextTarget, 99);
        setLoadingProgress(progress);

        timeoutId = setTimeout(updateProgress, nextDelay);
      };

      timeoutId = setTimeout(updateProgress, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, enableLoadingScreen]);

  // When loading screen is OFF: dismiss as soon as AI data arrives
  useEffect(() => {
    if (isLoading && !enableLoadingScreen && aiData) {
      setIsLoading(false);
    }
  }, [isLoading, enableLoadingScreen, aiData]);

  const processFile = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataArr = new Uint8Array(event.target.result);
      const workbook = XLSX.read(dataArr, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      setExcelData(json);
      setAiData(null);
      setIsLoading(true);

      try {
        // Use the first 6 columns only
        const allColumns = json.length > 0 ? Object.keys(json[0]) : [];
        const columns = allColumns.slice(0, 6);
        console.log('📋 Sending columns:', columns);

        // Format each populated row as a structured string entry
        const descriptions = json
          .map(row => {
            const parts = columns
              .map(col => {
                const val = row[col];
                return val !== undefined && val !== '' ? `${col}: ${val}` : null;
              })
              .filter(Boolean);
            return parts.length > 0 ? parts.join(' | ') : null;
          })
          .filter(Boolean);

        console.log(`📝 Sending ${descriptions.length} rows to API`);

        if (descriptions.length === 0) {
          throw new Error(`No populated rows found. Columns detected: ${allColumns.join(', ')}`);
        }

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descriptions })
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Server returned an error");
        }
        setAiData(result);
      } catch (error) {
        console.error("API Error", error);
        setAiData({
          craziestPost: "Failed to connect to AI. Imagine something crazy here.",
          personalityType: "Error-Type",
          personalityDescription: "The AI broke, but you're probably very nice.",
          workEthicRanking: 1,
          roast: "Could not roast you."
        });
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
    if (!enableLoadingScreen) {
      return (
        <div className="home-container loading-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: '"Patrick Hand", cursive', fontSize: '32px' }}>NO LOADING SCREEN</p>
        </div>
      );
    }

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
          <span className="progress-text">{Math.round(loadingProgress)}%</span>
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

    let streakEmoji = '😴';
    if (maxStreak > 14) {
      streakEmoji = '🔥';
    } else if (maxStreak >= 7) {
      streakEmoji = '🧑‍💻';
    }

    return (
      <div className="home-container data-view">
        <div className="table-header-bar">
          <button onClick={handleClear} className="clear-button">Start Over</button>
          <button className="add-button" title="Add New" onClick={() => setShowCardModal(true)}>
            <svg viewBox="0 0 24 24" width="36" height="36" stroke="#1f1f1f" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <div className="dashboard-grid">
          {/* Quadrant 2: Top Left */}
          <div className="streak-card empty-card">
            <span className="streak-text">
              <span className="wave-container">
                {'Craziest'.split('').map((char, index) => (
                  <span
                    key={index}
                    className="wave-char"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {char}
                  </span>
                ))}
              </span>{' '}
              Post
            </span>
            <div className="craziest-post-wrapper">
              <AutoScaleText color="#D5451B" text={aiData?.craziestPost || "Loading your craziest post..."} />
            </div>
          </div>

          {/* Quadrant 1: Top Right */}
          <div className="streak-card empty-card" style={{ overflow: 'hidden' }}>
            <span className="streak-text">
              <span style={{ color: '#D5451B' }}>{aiData?.personalityType || '???'}</span>: Personality Type
            </span>
            <p className="personality-desc">
              {aiData?.personalityDescription || 'Loading personality analysis...'}
            </p>
            <svg 
              className="personality-waves"
              viewBox="0 0 400 80" 
              style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '80px' }}
            >
              <path d="M -20 30 Q 30 22, 80 30 T 180 30 T 280 30 T 380 30 T 480 30" fill="none" stroke="#1f1f1f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M -40 50 Q 10 42, 60 50 T 160 50 T 260 50 T 360 50 T 460 50" fill="none" stroke="#1f1f1f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M -60 70 Q -10 62, 40 70 T 140 70 T 240 70 T 340 70 T 440 70" fill="none" stroke="#1f1f1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Quadrant 3: Bottom Left */}
          <div className="streak-card empty-card">
            <span className="streak-text">Work Ethic Ranking</span>
            <p className="roast-text">
              "{aiData?.roast ? `${aiData.roast} 😂` : 'Loading roast...'}"
            </p>
            <div className="ranking-bar-container">
              <div 
                className="ranking-bar-fill"
                style={{ 
                  width: `${rankingPercent}%`,
                  minWidth: '75px', // Ensure text is never cut off
                  backgroundColor: `color-mix(in srgb, #D5451B ${targetRanking}%, #ffdaab)` 
                }}
              >
                <span className="ranking-text">{rankingPercent}%</span>
              </div>
            </div>
          </div>

          {/* Quadrant 4: Bottom Right */}
          <div className="streak-card">
            <span className="streak-text">
              <span style={{ color: '#D5451B' }}>{maxStreak} Days</span>: Longest Streak
              <span style={{ fontFamily: 'sans-serif', marginLeft: '8px' }}>{streakEmoji}</span>
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

        {/* Capstone Card Modal */}
        {showCardModal && (
          <div className="card-modal-backdrop" onClick={() => setShowCardModal(false)}>
            <div className="card-modal-container" onClick={e => e.stopPropagation()}>
              <div
                className="capstone-card"
                onMouseDown={handleCardMouseDown}
                onMouseMove={handleCardMouseMove}
                onMouseUp={handleCardMouseUp}
                onMouseLeave={handleCardMouseUp}
              >
                <canvas ref={canvasRef} className="card-drawing-canvas" width={880} height={560} />
                <div className="card-content">
                  <p className="card-title-text">Capstone</p>
                  <p className="card-field-label">MY NAME IS</p>
                  <input type="text" className="card-name-input" placeholder="your name" value={cardName} onChange={e => setCardName(e.target.value)} />
                  <p className="card-field-label">ISSUED ON</p>
                  <p className="card-date-value">{today}</p>
                  <div className="card-footer-row">
                    <span className="card-number-label">NO. #</span>
                    <div className="card-sig-zone">
                      <div className="card-sig-line" />
                      <p className="card-field-label" style={{ marginTop: '4px' }}>Signature</p>
                    </div>
                  </div>
                </div>
              </div>
              <button className="card-submit-btn" onClick={handleCardSubmit}>Submit</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Otherwise, render the default dropzone view
  return (
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
  );
}

function GalleryDetailModal({ entry, onClose }) {
  const [rankingPercent, setRankingPercent] = useState(0);
  const targetRanking = entry.aiData?.workEthicRanking || 0;

  useEffect(() => {
    const t = setTimeout(() => setRankingPercent(targetRanking), 200);
    return () => clearTimeout(t);
  }, [targetRanking]);

  const { maxStreak, endDate, streakDates: streakArr, allDates: allArr } = entry.streak || {};
  const streakDates = new Set(streakArr || []);
  const allDates = new Set(allArr || []);

  const gridDays = [];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthLabels = [];
  if (endDate != null) {
    let currentMonth = -1;
    for (let i = 139; i >= 0; i--) {
      const day = endDate - i;
      let status = 'empty';
      if (streakDates.has(day)) status = 'streak';
      else if (allDates.has(day)) status = 'logged';
      gridDays.push({ day, status });
      if (i % 7 === 6) {
        const jsDate = excelDateToJSDate(day);
        const month = jsDate.getUTCMonth();
        if (month !== currentMonth) {
          monthLabels.push({ colIndex: (139 - i) / 7, label: monthNames[month] });
          currentMonth = month;
        }
      }
    }
  }

  let streakEmoji = '😴';
  if (maxStreak > 14) streakEmoji = '🔥';
  else if (maxStreak >= 7) streakEmoji = '🧑‍💻';

  return (
    <div className="card-modal-backdrop" onClick={onClose}>
      <div className="gallery-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="gallery-detail-header">
          <span className="gallery-detail-name">{entry.name}</span>
          <span className="gallery-detail-meta">NO. {entry.cardNumber} · {entry.issuedDate}</span>
        </div>

        <div className="dashboard-grid">
          {/* Craziest Post */}
          <div className="streak-card empty-card">
            <span className="streak-text">
              <span className="wave-container">
                {'Craziest'.split('').map((char, i) => (
                  <span key={i} className="wave-char" style={{ animationDelay: `${i * 0.1}s` }}>{char}</span>
                ))}
              </span>{' '}Post
            </span>
            <div className="craziest-post-wrapper">
              <AutoScaleText color="#D5451B" text={entry.aiData?.craziestPost || '—'} />
            </div>
          </div>

          {/* Personality Type */}
          <div className="streak-card empty-card" style={{ overflow: 'hidden' }}>
            <span className="streak-text">
              <span style={{ color: '#D5451B' }}>{entry.aiData?.personalityType || '???'}</span>: Personality Type
            </span>
            <p className="personality-desc">{entry.aiData?.personalityDescription || ''}</p>
            <svg className="personality-waves" viewBox="0 0 400 80" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '80px' }}>
              <path d="M -20 30 Q 30 22, 80 30 T 180 30 T 280 30 T 380 30 T 480 30" fill="none" stroke="#1f1f1f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M -40 50 Q 10 42, 60 50 T 160 50 T 260 50 T 360 50 T 460 50" fill="none" stroke="#1f1f1f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M -60 70 Q -10 62, 40 70 T 140 70 T 240 70 T 340 70 T 440 70" fill="none" stroke="#1f1f1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Work Ethic Ranking */}
          <div className="streak-card empty-card">
            <span className="streak-text">Work Ethic Ranking</span>
            <p className="roast-text">"{entry.aiData?.roast ? `${entry.aiData.roast} 😂` : '—'}"</p>
            <div className="ranking-bar-container">
              <div
                className="ranking-bar-fill"
                style={{
                  width: `${rankingPercent}%`,
                  minWidth: '75px',
                  backgroundColor: `color-mix(in srgb, #D5451B ${targetRanking}%, #ffdaab)`
                }}
              >
                <span className="ranking-text">{Math.round(rankingPercent)}%</span>
              </div>
            </div>
          </div>

          {/* Longest Streak */}
          <div className="streak-card">
            <span className="streak-text">
              <span style={{ color: '#D5451B' }}>{maxStreak || 0} Days</span>: Longest Streak
              <span style={{ fontFamily: 'sans-serif', marginLeft: '8px' }}>{streakEmoji}</span>
            </span>
            {endDate != null && (
              <div className="graph-container">
                <div className="contribution-graph">
                  {gridDays.map(d => (
                    <div key={d.day} className={`day-square day-${d.status}`} />
                  ))}
                </div>
                <div className="month-labels">
                  {monthLabels.map(m => (
                    <span key={m.colIndex} className="month-label" style={{ left: `${m.colIndex * 18}px` }}>{m.label}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button className="card-submit-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function Gallery() {
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('galleryEntries') || '[]');
    setEntries(stored);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="gallery-container" style={{ justifyContent: 'center' }}>
        <p style={{ fontFamily: '"Patrick Hand", cursive', fontSize: '22px', color: '#888' }}>
          No cards yet — submit one from the dashboard!
        </p>
      </div>
    );
  }

  return (
    <div className="gallery-container">
      <div className="gallery-track">
        {entries.map(entry => (
          <div key={entry.id} className="gallery-card capstone-gallery-card" onClick={() => setSelected(entry)}>
            {entry.signatureDataUrl && (
              <img src={entry.signatureDataUrl} className="gallery-sig-img" alt="sig" />
            )}
            <span className="read-more-text">Click to see more</span>
            <div className="gallery-card-inner">
              <p className="gallery-card-title">Capstone</p>
              <p className="gallery-card-name">{entry.name}</p>
              <p className="gallery-card-number">NO. {entry.cardNumber}</p>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <GalleryDetailModal entry={selected} onClose={() => setSelected(null)} />
      )}
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
