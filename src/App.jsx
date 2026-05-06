import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Shield, 
  ShieldCheck,
  Layout, 
  LayoutDashboard,
  Settings, 
  TrendingUp,
  Cpu,
  ArrowRight,
  FileUp,
  Loader2,
  PieChart,
  BarChart3,
  User,
  Bell,
  Lock,
  Globe,
  Database,
  Download,
  Check,
  RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import * as pdfjsLib from 'pdfjs-dist';

// Use local worker for reliable extraction
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const LexGuardDashboard = () => {
  const [contractText, setContractText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fileName, setFileName] = useState('');
  const [analysisStep, setAnalysisStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [contractData, setContractData] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }

    setFileName(file.name);
    setIsExtracting(true);
    setAnalysisResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let lastY;
        let pageText = '';
        for (const item of textContent.items) {
          if (lastY !== undefined && Math.abs(lastY - item.transform[5]) > 2) {
            pageText += '\n';
          }
          pageText += item.str + ' ';
          lastY = item.transform[5];
        }
        fullText += pageText + '\n--- Page ' + i + ' ---\n';
      }
      
      if (!fullText.trim() || fullText.length < 50) {
        throw new Error('PDF extraction returned minimal text.');
      }

      setContractText(fullText);
      setIsExtracting(false);
      triggerAnalysis(fullText);
    } catch (error) {
      console.error('PDF Extraction Failure:', error);
      setIsExtracting(false);
      alert(`Contract Guard Error: ${error.message}`);
    }
  };

  const triggerAnalysis = (text) => {
    if (!text) return;
    setIsAnalyzing(true);
    setProgress(10);
    setAnalysisStep('Initializing Legal Engine...');
    
    setTimeout(() => {
      setProgress(40);
      setAnalysisStep('Scanning Clauses & Operational Risks...');
      
      setTimeout(() => {
        setProgress(70);
        setAnalysisStep('Benchmarking Compensation against Market Data...');
        
        setTimeout(() => {
          setProgress(100);
          setAnalysisStep('Audit Complete');
          const result = generateMockAnalysis(text);
          setAnalysisResult(result);
          setContractData(result.data);
          setIsAnalyzing(false);
        }, 1200);
      }, 1000);
    }, 800);
  };

  const generateMockAnalysis = (text) => {
    const docContext = {
      allDollars: text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g) || [],
      allPercentages: text.match(/\d+(?:\.\d+)?%/g) || [],
      allProperNouns: text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || []
    };

    const extractAdvanced = (patterns, fallback = "[NOT DETECTED]") => {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          let val = (match[1] || match[0]).trim();
          val = val.replace(/^(a|an|the|this|that|such)\s+/i, '');
          let previousVal;
          do {
            previousVal = val;
            val = val.replace(/[.,;:\)\s]+$/, '')
                     .replace(/\s+(or|and|including|subject\s+to|as\s+defined|and\s+construed|benefit\s+plan|the\s+grant\s+of|employee\s+shall\s+be).*$/i, '')
                     .replace(/^(or|and)\s+/i, '')
                     .trim();
          } while (val !== previousVal);
          if (val.length > 2) return val;
        }
      }
      return fallback;
    };

    const states = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming", "NY", "CA", "TX", "WA", "FL", "DE"];

    const salary = extractAdvanced([
      /(?:salary|compensation|remuneration|base\s+pay)\s*[:=-]?\s*(?:\(?\s*)?(\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:rate\s+of)\s*(?:\(?\s*)?(\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      /(\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(?:per\s+annum|per\s+year|annually)/i
    ], docContext.allDollars[0] || "Not Found");

    const equity = extractAdvanced([
      /(?:eligible\s+to\s+receive|grant\s+of|award\s+of)\s+([0-9,]+\s+(?:shares|options|units|rsus))/i,
      /([0-9,]+\s+(?:shares|options|units|rsus))/i,
      /(?:grant\s+of|award\s+of)\s+([^,.;]{3,60})/i
    ], docContext.allDollars.find(d => d.includes('share') || d.includes('option')) || "Not Detected");

    const jurisdiction = extractAdvanced([
      /(?:laws\s+of|jurisdiction\s+of|governed\s+by|laws\s+of\s+the\s+state\s+of)\s+(?!United States|and|the|State|Commonwealth)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,1})/i,
      /(?!United States|State|Commonwealth)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,1})\s+(?:law|jurisdiction)/i
    ], "Not Found");

    let cleanJurisdiction = jurisdiction;
    const genericWords = ["State", "Commonwealth", "City", "County", "Laws", "Jurisdiction"];
    if (jurisdiction === "Not Found" || genericWords.includes(jurisdiction) || jurisdiction.length < 3) {
      const stateMatch = states.find(s => new RegExp(`\\b${s}\\b`, 'i').test(text));
      if (stateMatch) cleanJurisdiction = stateMatch;
    }
    if (cleanJurisdiction === "NY") cleanJurisdiction = "New York";
    if (cleanJurisdiction === "CA") cleanJurisdiction = "California";

    const rawTitle = extractAdvanced([
      /(?:title|position|role|employed\s+as)\s*[:=-]?\s*([A-Z][a-zA-Z\s,]{3,60})(?=[.;\n]|\s{2,}|$)/i,
      /(?:employed|working)\s+as\s+(?:a|an|the)?\s*([A-Z][a-zA-Z\s,]{3,60})/i
    ], "Professional");

    const bonus = extractAdvanced([
      /(?:bonus|incentive)\s*[:=-]?\s*([^,.;\n]{3,60})/i,
      /(\d+(?:\.\d+)?%)\s+(?:target\s+)?bonus/i
    ], "Not Explicitly Defined");

    const determineLevel = (title) => {
      const t = title.toLowerCase();
      if (t.includes('vp') || t.includes('vice president') || t.includes('chief') || t.includes('head') || t.includes('director')) return 'Executive';
      if (t.includes('senior') || t.includes('lead') || t.includes('principal')) return 'Senior';
      if (t.includes('junior') || t.includes('associate') || t.includes('entry')) return 'Junior';
      return 'Professional';
    };

    const level = determineLevel(rawTitle);
    const numericSalary = parseFloat(salary.replace(/[$,]/g, '')) || 0;
    
    const BENCHMARKS = {
      Executive: { salary: "$250k - $450k", min: 250000, max: 450000 },
      Senior: { salary: "$160k - $240k", min: 160000, max: 240000 },
      Professional: { salary: "$110k - $170k", min: 110000, max: 170000 },
      Junior: { salary: "$70k - $105k", min: 70000, max: 105000 }
    };

    const data = {
      salary: numericSalary,
      jurisdiction: cleanJurisdiction,
      level: level,
      benchmark: BENCHMARKS[level],
      title: rawTitle,
      equity: equity,
      bonus: bonus
    };

    const markdown = `
# Employment Audit Report: ${rawTitle}
**Role Grade:** ${level} | **Jurisdiction:** ${cleanJurisdiction}

---

### 1. Contract Overview & Executive Summary
Total cash compensation is anchored at **${salary}**. This is solidly positioned for a ${level}-level role.

### 2. Clause-by-Clause Legal and Operational Report
#### I. Compensation & Bonus Structure
*   **Base Salary:** **${salary}**
*   **Incentive Pay:** **${bonus}**
*   **Equity Vesting:** ${equity}
`;

    return { markdown, data };
  };

  const renderBenchmarks = () => {
    const calculateTax = (gross, state) => {
      const fedRate = gross > 150000 ? 0.18 : 0.125;
      const stateRate = state.toLowerCase().includes('new york') ? 0.07 : 0.05;
      const totalTax = gross * (fedRate + stateRate + 0.0765);
      return {
        net: gross - totalTax,
        monthly: (gross - totalTax) / 12,
        state: state
      };
    };

    const taxInfo = contractData?.salary ? calculateTax(contractData.salary, contractData.jurisdiction) : null;

    return (
      <div className="audit-report" style={{ animation: 'slideUp 0.5s ease-out' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
          <div className="glass" style={{ padding: '2.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Market Comparison</h3>
            {contractData ? (
              <p>Your extracted salary is <strong>${contractData.salary.toLocaleString()}</strong>.</p>
            ) : <p>No data available.</p>}
          </div>
          <div className="glass" style={{ padding: '2.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Tax Estimation</h3>
            {taxInfo ? (
              <p>Estimated monthly net: <strong>${Math.round(taxInfo.monthly).toLocaleString()}</strong></p>
            ) : <p>No data available.</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'slideUp 0.5s ease-out' }}>
      <div className="glass upload-card" style={{ padding: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', textAlign: 'center' }}>Contract Analysis Portal</h2>
        <textarea
          className="textarea-field"
          placeholder="Paste contract text here..."
          rows={8}
          value={contractText}
          onChange={(e) => setContractText(e.target.value)}
          style={{ marginBottom: '1.5rem' }}
        />
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={() => triggerAnalysis(contractText)} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="spinner" size={18} /> : 'Analyze Agreement'}
          </button>
          <input type="file" id="pdf-upload" accept=".pdf" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border-subtle)' }} onClick={() => document.getElementById('pdf-upload').click()}>
            Upload PDF
          </button>
        </div>
      </div>

      {isAnalyzing && (
        <div className="glass" style={{ marginTop: '2rem', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span>{analysisStep}</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: '4px', background: 'var(--bg-hover)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${progress}%`, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {analysisResult && !isAnalyzing && (
        <div className="glass" style={{ marginTop: '2rem', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Check size={20} color="var(--success)" />
            <span>Analysis Ready</span>
          </div>
          <button className="btn-primary" onClick={() => setActiveTab('report')}>View Report</button>
        </div>
      )}
    </div>
  );

  const renderLegalReport = () => {
    if (analysisResult) {
      return (
        <div className="audit-report">
          <div className="glass" style={{ padding: '3rem' }}>
            <ReactMarkdown>{analysisResult.markdown}</ReactMarkdown>
          </div>
        </div>
      );
    }
    return (
      <div className="audit-report">
        <div className="glass" style={{ padding: '3rem' }}>
          <h3>Clause Explorer</h3>
          <p>Common contract architectures for MBA graduates.</p>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="glass" style={{ padding: '3rem' }}>
      <h3>Settings</h3>
      <p>Manage your account and preferences.</p>
    </div>
  );

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={24} color="var(--accent-primary)" />
          LexGuard Pro
        </div>
        <nav className="nav-links">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button className={`nav-item ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')} style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <FileText size={18} /> Legal Report
          </button>
          <button className={`nav-item ${activeTab === 'benchmarks' ? 'active' : ''}`} onClick={() => setActiveTab('benchmarks')} style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <BarChart3 size={18} /> Benchmarks
          </button>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <Settings size={18} /> Settings
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <header style={{ marginBottom: '3rem' }}>
          <h1 className="header-title" style={{ textTransform: 'capitalize' }}>{activeTab}</h1>
        </header>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'report' && renderLegalReport()}
        {activeTab === 'benchmarks' && renderBenchmarks()}
        {activeTab === 'settings' && renderSettings()}
      </main>
    </div>
  );
};

export default LexGuardDashboard;
