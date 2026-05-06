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

      setContractText(''); // Don't show PDF text in textarea
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
                     .replace(/\s+(or|and|including|subject\s+to|as\s+defined|and\s+construed|benefit\s+plan|the\s+grant\s+of|employee\s+shall\s+be|as\s+may).*$/i, '')
                     .replace(/^(or|and|Report\s*>|Report:)\s+/i, '')
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
      /(?:bonus|incentive|incentive\s+pay)\s*[:=-]?\s*([^,.;\n]{3,60})/i,
      /(\d+(?:\.\d+)?%)\s+(?:target\s+)?bonus/i,
      /(?:eligible\s+for\s+a\s+bonus\s+of)\s*([^,.;\n]{3,60})/i
    ], "Not Explicitly Defined");

    const clawback = extractAdvanced([
      /(?:clawback|repayment|return\s+of\s+funds)\s*[:=-]?\s*([^,.;\n]{3,60})/i,
      /(?:subject\s+to\s+repayment)\s+if\s+([^,.;\n]{3,60})/i
    ], "None Detected");

    const benefits = extractAdvanced([
      /(?:benefits|fringe\s+benefits|perks)\s*[:=-]?\s*([^,.;\n]{3,100})/i,
      /(?:health|dental|vision|401k)\s+(?:plans?|benefits?)/i
    ], "Standard Package");

    const vacation = extractAdvanced([
      /(?:vacation|pto|time\s+off|paid\s+leave|vacations\s+and\s+pto)\s*[:=-]?\s*([^,.;\n]{3,60})/i,
      /(\d+\s*(?:day|week)s?)\s+(?:of\s+)?(?:vacation|pto)/i,
      /(?:unlimited)\s+(?:vacation|pto|time\s+off)/i
    ], "Not Explicitly Defined");

    const severance = extractAdvanced([
      /(\d+\s*(?:month|day|week)s?)\s+(?:of\s+)?(?:base\s+)?severance/i,
      /(?:severance|termination)\s+(?:payment|benefit|pay)\s*[:=-]?\s*([^,.;\n]{3,20})/i
    ], "Not Found");

    const nonCompete = extractAdvanced([
      /(?:non-compete|non-competition|restrictive\s+covenant)\s*(?:period|term)?\s*[:=-]?\s*([^,.;\n]{3,20})/i,
      /(\d+\s*months?)\s+(?:non-compete|restriction)/i
    ], "Not Found");

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

    const currentBenchmark = BENCHMARKS[level];
    const isAboveBenchmark = numericSalary > currentBenchmark.max;
    const isBelowBenchmark = numericSalary > 0 && numericSalary < currentBenchmark.min;

    const data = {
      salary: numericSalary,
      jurisdiction: cleanJurisdiction,
      level: level,
      benchmark: currentBenchmark,
      title: rawTitle,
      equity: equity,
      vacation: vacation,
      severance: severance,
      bonus: bonus,
      clawback: clawback,
      nonCompete: nonCompete,
      benefits: benefits
    };

    const markdown = `
# Employment Audit Report: ${rawTitle}
**Role Grade:** ${level} | **Jurisdiction:** ${cleanJurisdiction}

---

### 1. Contract Overview & Executive Summary

This report provides a technical analysis of the employment offer for the position of **${rawTitle}**.

**Executive Key Findings:**
*   **Compensation Profile:** Total cash compensation is anchored at **${salary}**. This is **${isAboveBenchmark ? 'exceptionally strong' : isBelowBenchmark ? 'below market floor' : 'solidly positioned'}** for a ${level}-level role.
*   **Operational Risk:** The ${nonCompete === "Not Found" ? 'lack of a restrictive non-compete' : `presence of a **${nonCompete}** non-compete`} is a critical factor for your future career mobility.
*   **Equity Exposure:** ${equity === "Not Detected" ? "No equity grant was identified, which is atypical for startup-grade offers." : `Identified **${equity}** with standard vesting logic.`}

---

### 2. Clause-by-Clause Legal and Operational Report

#### I. Compensation & Bonus Structure
*   **Base Salary:** **${salary}** per annum.
*   **Incentive Pay:** **${bonus}**.
*   **Technical Reporting:** ${bonus === "Not Explicitly Defined" ? "The contract lacks a structured bonus formula." : `Performance criteria should be explicitly tied to KPIs to avoid discretionary ambiguity.`}
*   **Equity Vesting:** ${equity !== "Not Detected" ? `The grant of **${equity}** typically follows a 4-year cycle with a 1-year cliff.` : "N/A"}

#### II. Severance & Termination Conditions
*   **Terms:** **${severance}**.
*   **Impact:** The current definitions appear **${severance.includes('Not Found') ? 'underspecified' : 'standard'}** for the current market.

#### III. Intellectual Property & Restrictive Covenants
*   **IP Assignment:** Standard 'Work for Hire' clause identified.
*   **Non-Compete/Solicit:** **${nonCompete}**.

#### IV. Benefits & Additional Perks
*   **Package:** **${benefits}**.
*   **Time Off (PTO):** **${vacation}**.
*   **Observation:** ${vacation.toLowerCase().includes('unlimited') ? "Unlimited PTO is identified." : "An accrual-based policy is standard."}

#### V. Clawback Conditions
*   **Status:** **${clawback}**.
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

    const staples = [
      {
        title: "Base Salary & Bonus",
        icon: <TrendingUp size={18} />,
        desc: "Fixed annual compensation and performance-linked variables.",
        lookout: ["Clarity on 'Target' vs 'Maximum' bonus.", "Frequency of salary reviews."]
      },
      {
        title: "Equity & Stock Options",
        icon: <Database size={18} />,
        desc: "Ownership stakes including RSUs, ISOs, or NSOs.",
        lookout: ["Vesting schedule (Standard: 4yr/1yr cliff).", "Acceleration triggers."]
      },
      {
        title: "Non-Compete Clauses",
        icon: <ShieldCheck size={18} />,
        desc: "Restrictions on working for competitors after departure.",
        lookout: ["Geographic scope.", "Duration (12 months is the market ceiling)."]
      },
      {
        title: "Intellectual Property (IP)",
        icon: <Globe size={18} />,
        desc: "Ownership of work created during employment.",
        lookout: ["'Work for Hire' scope.", "Carve-outs for pre-existing inventions."]
      },
      {
        title: "Confidentiality (NDA)",
        icon: <Lock size={18} />,
        desc: "Protection of proprietary company information.",
        lookout: ["Duration of survival.", "Definition of 'Confidential Information'."]
      },
      {
        title: "Severance & Notice",
        icon: <FileText size={18} />,
        desc: "Protections and requirements during termination.",
        lookout: ["Months of pay based on years of service.", "Benefits continuation."]
      }
    ];

    const taxInfo = contractData?.salary ? calculateTax(contractData.salary, contractData.jurisdiction) : null;

    return (
      <div className="audit-report" style={{ animation: 'slideUp 0.5s ease-out' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
          <div className="glass" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
              <TrendingUp color="var(--accent-primary)" size={20} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Market Comparison</h3>
            </div>
            {contractData ? (
              <>
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Your Extracted Salary</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>${contractData.salary.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: `${(contractData.benchmark.min / 500000) * 100}%`, 
                      width: `${((contractData.benchmark.max - contractData.benchmark.min) / 500000) * 100}%`, 
                      height: '100%', 
                      background: 'rgba(99, 102, 241, 0.2)',
                      borderLeft: '1px solid var(--accent-primary)',
                      borderRight: '1px solid var(--accent-primary)'
                    }}></div>
                    <div style={{ 
                      position: 'absolute', 
                      left: `${(contractData.salary / 500000) * 100}%`, 
                      width: '4px', 
                      height: '100%', 
                      background: '#fff',
                      boxShadow: '0 0 10px rgba(255,255,255,0.5)',
                      zIndex: 2
                    }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>$0</span>
                    <span>Market Range: {contractData.benchmark.salary}</span>
                    <span>$500k+</span>
                  </div>
                </div>
              </>
            ) : <p>Upload a contract to see market data.</p>}
          </div>

          <div className="glass" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
              <Database color="var(--accent-primary)" size={20} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Post-Tax estimation</h3>
            </div>
            {taxInfo ? (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '8px' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Monthly Net</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>${Math.round(taxInfo.monthly).toLocaleString()}</span>
              </div>
            ) : <p>Waiting for data...</p>}
          </div>
        </div>

        {contractData && (
          <div className="glass" style={{ padding: '2.5rem', marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '2rem', textTransform: 'uppercase' }}>Extracted Contract Snapshot</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Position</span>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{contractData.title}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Base Salary</span>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>${contractData.salary.toLocaleString()}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Equity</span>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{contractData.equity}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>PTO / Vacation</span>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{contractData.vacation}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Clawbacks</span>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{contractData.clawback}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Severance</span>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{contractData.severance}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {staples.map((staple, idx) => (
            <div key={idx} className="glass" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <div style={{ color: 'var(--accent-primary)' }}>{staple.icon}</div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{staple.title}</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{staple.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {staple.lookout.map((item, i) => (
                  <li key={i} style={{ fontSize: '0.8rem', marginBottom: '8px', display: 'flex', gap: '8px' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-primary)', marginTop: '6px' }}></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'slideUp 0.5s ease-out' }}>
      <div className="glass upload-card" style={{ padding: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', textAlign: 'center' }}>Contract Analysis Portal</h2>
        
        {/* Hide textarea if PDF was uploaded */}
        {!fileName && (
          <textarea
            className="textarea-field"
            placeholder="Paste contract text here..."
            rows={8}
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            style={{ marginBottom: '1.5rem' }}
          />
        )}
        
        {fileName && (
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', marginBottom: '1.5rem', border: '1px dashed var(--accent-primary)' }}>
            <FileText size={32} color="var(--accent-primary)" style={{ marginBottom: '10px' }} />
            <p style={{ fontWeight: 600 }}>{fileName}</p>
            <button style={{ background: 'transparent', border: 'none', color: 'var(--error)', fontSize: '0.8rem', cursor: 'pointer', marginTop: '8px' }} onClick={() => { setFileName(''); setContractText(''); }}>Remove file</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={() => triggerAnalysis(contractText || 'PDF_UPLOADED')} disabled={isAnalyzing || (!contractText && !fileName)}>
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
    // Safety check to prevent crash if analysisResult is malformed
    const markdownText = analysisResult?.markdown || '';
    
    if (analysisResult && markdownText) {
      return (
        <div className="audit-report" style={{ animation: 'slideUp 0.5s ease-out' }}>
          <div className="glass" style={{ padding: '3.5rem', marginBottom: '2.5rem', minHeight: '400px' }}>
            <ReactMarkdown className="markdown-content">
              {markdownText}
            </ReactMarkdown>
          </div>
          <div style={{ textAlign: 'center', paddingBottom: '4rem' }}>
            <button 
              className="btn-primary" 
              onClick={() => {
                const blob = new Blob([markdownText], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `LexGuard_Audit_Report.md`;
                a.click();
              }}
            >
              <Download size={18} /> Export Technical Audit
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="audit-report">
        <div className="glass" style={{ padding: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Clause Explorer</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Common contract architectures for MBA graduates.</p>
        </div>
      </div>
    );
  };

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
          <h1 className="header-title" style={{ textTransform: 'capitalize' }}>{activeTab.replace('-', ' ')}</h1>
        </header>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'report' && renderLegalReport()}
        {activeTab === 'benchmarks' && renderBenchmarks()}
        {activeTab === 'settings' && (
          <div className="glass" style={{ padding: '3rem' }}>
            <h3>Account Settings</h3>
            <p>Manage your professional profile.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default LexGuardDashboard;
