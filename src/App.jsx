import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import './App.css';

function Home() {
  const [excelData, setExcelData] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
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
    };
    reader.readAsArrayBuffer(file);
    
    // Clear the input value so the same file can be uploaded again if needed
    e.target.value = null;
  };

  const handleClear = () => {
    setExcelData(null);
  };

  // If we have parsed data, render the table view
  if (excelData) {
    if (excelData.length === 0) {
      return (
        <div className="home-container">
          <p style={{ fontFamily: '"Patrick Hand", cursive', fontSize: '24px' }}>No data found in the spreadsheet.</p>
          <button onClick={handleClear} className="clear-button">Start Over</button>
        </div>
      );
    }

    // Extract headers from the first row
    const headers = Object.keys(excelData[0]);

    return (
      <div className="home-container data-view">
        <div className="table-header-bar">
          <button onClick={handleClear} className="clear-button">Start Over</button>
        </div>
        
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {excelData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((header) => (
                    <td key={header + rowIndex}>{row[header]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Otherwise, render the default dropzone view
  return (
    <div className="home-container">
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
          <p>drag your worklog excel</p>
          <p className="file-formats">.xlsx</p>
        </div>
      </label>
    </div>
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
