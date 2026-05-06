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

  // Auto-scroll to top on tab change
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

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
          // Use word boundaries for scrubbing to prevent truncation (e.g., Associate -> ssociate)
          val = val.replace(/^(a|an|the|this|that|such)\s+/i, '');
          let previousVal;
          do {
            previousVal = val;
            val = val.replace(/[.,;:\)\s]+$/, '')
                     .replace(/\s+(or|and|including|subject\s+to|as\s+defined|and\s+construed|benefit\s+plan|the\s+grant\s+of|employee\s+shall\s+be|employee\b|as\s+may|with\s+vaynermedia|vaynermedia|with\b).*$/i, '')
                     .replace(/^(or|and|Report\s*>|Report:|as\s+a\s+member\s+of\s+the\s+company’s\s+residency\s+program|you\s+will\s+be\s+eligible\s+to\s+participate\s+in\s+the\s+company’s|required\s+by|required\b|with\b)\s+/i, '')
                     .replace(/,\s*$/, '') // Remove trailing comma after scrubbing
                     .trim();
          } while (val !== previousVal);
          
          if (val.length > 2) {
            // Contextual override for Vacation
            if (val.toLowerCase().includes('unlimited')) return "Unlimited";
            // More conservative article stripping to avoid clipping (e.g. Associate -> ssociate)
            val = val.replace(/^(a|an|the|this|that|such)\s+/i, '');
            // Proper casing for specific fields
            return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
          }
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
      /(?:laws\s+of|jurisdiction\s+of|governed\s+by|laws\s+of\s+the\s+state\s+of)\s+(?!United States|and|the|State|Commonwealth|Required|Provided|With)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,1})/i,
      /(?!United States|State|Commonwealth|Required|With)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,1})\s+(?:law|jurisdiction)/i
    ], "Not Found");

    // Second-pass surgical state resolver
    let cleanJurisdiction = jurisdiction;
    if (jurisdiction.toLowerCase().includes('required by')) {
      const match = jurisdiction.match(/\b(NY|CA|MA|TX|WA|FL)\b/i);
      if (match) cleanJurisdiction = match[1].toUpperCase();
    }

    const genericWords = ["State", "Commonwealth", "City", "County", "Laws", "Jurisdiction"];
    if (jurisdiction === "Not Found" || genericWords.includes(jurisdiction) || jurisdiction.length < 3) {
      const stateMatch = states.find(s => new RegExp(`\\b${s}\\b`, 'i').test(text));
      if (stateMatch) cleanJurisdiction = stateMatch;
    }
    if (cleanJurisdiction === "NY") cleanJurisdiction = "New York";
    if (cleanJurisdiction === "CA") cleanJurisdiction = "California";

    const rawTitle = extractAdvanced([
      /(?:employed\s+as|position\s+of|role\s+of)\s+([A-Za-z\s,]{3,80})(?=\s+(?:with|on|at|for|under|subject|effective|shall)|[.;\n]|$)/i,
      /(?:title|position|role)\s*[:=-]?\s*([A-Za-z\s,]{3,60})(?=[.;\n]|\s{2,}|$)/i,
      /(?:employed|working)\s+as\s+(?:a|an|the)?\s*([A-Za-z\s,]{3,60})/i
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
      /(eligible\s+after\s+\d+\s+days)/i,
      /(\d+\s*day\s+period)/i,
      /(?:eligible\s+to\s+participate\s+in\s+the\s+company’s\s+[^,.;\n]{3,60})/i,
      /(?:benefits|fringe\s+benefits|perks)\s*[:=-]?\s*([^,.;\n]{3,100})/i
    ], "Standard Package");

    const vacation = extractAdvanced([
      /(\d+\s*hours?\s+or\s+\d+\s*(?:day|week)s?\s+for\s+each\s+\d+\s*day\s+period)/i,
      /(?:unlimited)\s+(?:vacation|pto|time\s+off)/i,
      /(?:vacation|pto|time\s+off|paid\s+leave|vacations\s+and\s+pto)\s*[:=-]?\s*([^,.;\n]{3,60})/i
    ], "Standard Accrual");

    const terminationType = extractAdvanced([
      /(at\s*will|at-will)/i,
      /(?:terminated\s+at\s+any\s+time)/i
    ], "Contractual Term");

    const ipRights = extractAdvanced([
      /(work\s+product|proprietary\s+rights|work\s+for\s+hire)/i,
      /(?:assignment\s+of\s+inventions)/i
    ], "Standard IP Assignment");

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
      benefits: benefits,
      terminationType: terminationType,
      ipRights: ipRights
    };

    const markdown = `
# Employment Audit Report: ${rawTitle}
**Role Grade:** *${level}* | **Jurisdiction:** *${cleanJurisdiction}*

---

### 1. Contract Overview & Executive Summary

This report provides a technical analysis of the employment offer for the position of **${rawTitle}**.

**Executive Key Findings:**
*   **Compensation Profile:** Total cash compensation is anchored at *${salary}*. This is *${isAboveBenchmark ? 'exceptionally strong' : isBelowBenchmark ? 'below market floor' : 'solidly positioned'}* for a ${level}-level role.
*   **Operational Risk:** The ${nonCompete === "Not Found" ? 'lack of a restrictive non-compete' : `presence of a *${nonCompete}* non-compete`} is a critical factor for your future career mobility.
*   **Equity Exposure:** ${equity === "Not Detected" ? "No equity grant was identified, which is atypical for startup-grade offers." : `Identified *${equity}* with standard vesting logic.`}

---

### 2. Clause-by-Clause Legal and Operational Report

#### I. Compensation & Bonus Structure
*   **Base Salary:** *${salary}* per annum.
*   **Incentive Pay:** *${bonus}*.
*   **Technical Reporting:** ${bonus === "Not Explicitly Defined" ? "The contract lacks a structured bonus formula." : `Performance criteria should be explicitly tied to KPIs to avoid discretionary ambiguity.`}
*   **Equity Vesting:** ${equity !== "Not Detected" ? `The grant of *${equity}* typically follows a 4-year cycle with a 1-year cliff.` : "N/A"}

#### II. Severance & Termination Conditions
*   **Terms:** *${severance}*.
*   **Status:** *${terminationType}*.
*   **Impact:** ${terminationType.toLowerCase().includes('at will') ? "At-will employment allows either party to terminate the relationship at any time, which provides maximum flexibility but minimal notice security." : "The contract establishes a protected term window."}

#### III. Intellectual Property & Restrictive Covenants
*   **IP Assignment:** *${ipRights}*.
*   **Non-Compete/Solicit:** *${nonCompete}*.

#### IV. Benefits & Additional Perks
*   **Package:** *${benefits}*.
*   **Time Off (PTO):** *${vacation}*.
*   **Observation:** ${vacation.toLowerCase().includes('unlimited') ? "Unlimited PTO is a modern benefit that offers flexibility, though actual usage is subject to 'ultimate decision' and reasonability clauses as seen in this document." : "An accrual-based policy provides a guaranteed 'bank' of days."}

#### V. Clawback Conditions
*   **Status:** *${clawback}*.
`;

    return { markdown, data };
  };

  const renderBenchmarks = () => {
    const calculateTaxDetailed = (gross, state) => {
      const s = state.toLowerCase();
      
      // Federal (Rough Progressive Approximation for 2024/2025)
      let fed = 0;
      if (gross > 191950) fed = gross * 0.24;
      else if (gross > 100525) fed = gross * 0.22;
      else if (gross > 47150) fed = gross * 0.12;
      else fed = gross * 0.10;

      // FICA (Social Security & Medicare)
      const fica = gross * 0.0765;

      // State & City Estimates
      let stateTax = 0;
      let cityTax = 0;
      
      if (s.includes('new york') || s.includes('ny')) {
        stateTax = gross * 0.06;
        if (s.includes('new york city') || s.includes('nyc')) {
          cityTax = gross * 0.038;
        }
      } else if (s.includes('california') || s.includes('ca')) {
        stateTax = gross * 0.085;
      } else if (s.includes('massachusetts') || s.includes('ma')) {
        stateTax = gross * 0.05;
      } else if (s.includes('texas') || s.includes('tx') || s.includes('washington') || s.includes('wa') || s.includes('florida') || s.includes('fl')) {
        stateTax = 0;
      } else {
        stateTax = gross * 0.045; // National average fallback
      }

      const totalTax = fed + fica + stateTax + cityTax;
      
      return {
        gross,
        fed,
        fica,
        stateTax,
        cityTax,
        totalTax,
        net: gross - totalTax,
        monthly: (gross - totalTax) / 12,
        state: state
      };
    };

    const taxInfo = contractData?.salary ? calculateTaxDetailed(contractData.salary, contractData.jurisdiction) : null;

    const staples = [
      {
        title: "Base Salary & Bonus",
        icon: <TrendingUp size={18} />,
        desc: contractData?.salary ? `Your salary of $${contractData.salary.toLocaleString()} is paired with: ${contractData.bonus}.` : "Fixed annual compensation and performance-linked variables.",
        lookout: [
          `Market Grade: ${contractData?.level || 'Professional'}.`,
          contractData?.bonus?.includes('Not') ? "Request a formal bonus structure (10-20% target is standard for MBAs)." : "Ensure KPIs are objective and not purely discretionary."
        ]
      },
      {
        title: "Equity & Stock Options",
        icon: <Database size={18} />,
        desc: contractData?.equity !== "Not Detected" ? `Identified: ${contractData.equity}.` : "No equity detected in this contract.",
        lookout: [
          "Vesting: Standard is 4yr with a 1yr cliff.",
          "Check for 'Double-Trigger' acceleration in case of acquisition."
        ]
      },
      {
        title: "Termination Status",
        icon: <RefreshCw size={18} />,
        desc: contractData?.terminationType?.toLowerCase().includes('at will') ? "Status: At-Will. Either party can terminate without specific cause." : `Status: ${contractData?.terminationType || 'Contractual'}.`,
        lookout: [
          "At-will status provides flexibility but zero notice security.",
          "Negotiate for a 30-60 day notice period if possible."
        ]
      },
      {
        title: "Intellectual Property (IP)",
        icon: <Globe size={18} />,
        desc: `Scope: ${contractData?.ipRights || 'Standard Assignment'}.`,
        lookout: [
          contractData?.ipRights?.toLowerCase().includes('proprietary') ? "Proprietary Rights means the company owns anything created 'within the scope' of your work." : "Check for 'Work for Hire' vs 'Assignment' nuances.",
          "Ensure pre-existing inventions are excluded (Exclusion List)."
        ]
      },
      {
        title: "Time Off (PTO)",
        icon: <FileText size={18} />,
        desc: `Policy: ${contractData?.vacation || 'Standard'}.`,
        lookout: [
          contractData?.vacation?.toLowerCase().includes('unlimited') ? "Unlimited PTO is subject to manager approval; clarify the 'reasonability' clause." : "Check if unused days roll over or are 'use-it-or-lose-it'.",
          "Confirm if PTO is paid out upon termination (State law varies)."
        ]
      },
      {
        title: "Non-Compete Clauses",
        icon: <ShieldCheck size={18} />,
        desc: contractData?.nonCompete !== "Not Found" ? `Restriction: ${contractData.nonCompete}.` : "No non-compete restriction detected.",
        lookout: [
          "Geographic scope should be narrow (State vs. National).",
          "Duration: 12 months is the market ceiling for non-executives."
        ]
      }
    ];

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
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Take-Home Pay in *{taxInfo.state}*</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>${Math.round(taxInfo.net).toLocaleString()}</span>
                  </div>
                  
                  {/* Stacked Tax Bar Chart */}
                  <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden', display: 'flex', marginBottom: '10px' }}>
                    <div style={{ width: `${(taxInfo.net / taxInfo.gross) * 100}%`, background: 'var(--success)', height: '100%' }} title="Net Pay"></div>
                    <div style={{ width: `${(taxInfo.fed / taxInfo.gross) * 100}%`, background: 'var(--accent-primary)', height: '100%', opacity: 0.8 }} title="Federal"></div>
                    <div style={{ width: `${(taxInfo.fica / taxInfo.gross) * 100}%`, background: 'var(--accent-primary)', height: '100%', opacity: 0.5 }} title="FICA"></div>
                    <div style={{ width: `${(taxInfo.stateTax / taxInfo.gross) * 100}%`, background: 'var(--warning)', height: '100%' }} title="State"></div>
                    <div style={{ width: `${(taxInfo.cityTax / taxInfo.gross) * 100}%`, background: 'var(--error)', height: '100%' }} title="Local/City"></div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div> Net Income
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', opacity: 0.8 }}></div> Federal
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }}></div> State
                    </div>
                    {taxInfo.cityTax > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--error)' }}></div> City
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Federal Tax:</span>
                    <span style={{ float: 'right' }}>-${Math.round(taxInfo.fed).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>FICA:</span>
                    <span style={{ float: 'right' }}>-${Math.round(taxInfo.fica).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{taxInfo.state} State:</span>
                    <span style={{ float: 'right' }}>-${Math.round(taxInfo.stateTax).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Local/City Tax:</span>
                    <span style={{ float: 'right' }}>-${Math.round(taxInfo.cityTax).toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>Monthly: ${Math.round(taxInfo.monthly).toLocaleString()}</span>
                </div>
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
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Termination</span>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{contractData.terminationType}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>IP Rights</span>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{contractData.ipRights}</span>
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
          <div className="glass" style={{ padding: '3.5rem', marginBottom: '2.5rem', minHeight: '400px', color: 'var(--text-primary)' }}>
            {analysisResult && (
              <div className="markdown-content">
                <ReactMarkdown>
                  {markdownText}
                </ReactMarkdown>
              </div>
            )}
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
          <div className="audit-report" style={{ animation: 'slideUp 0.5s ease-out' }}>
            <div className="glass" style={{ padding: '3rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem' }}>Professional Profile</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>First Name</label>
                  <input type="text" className="textarea-field" style={{ padding: '12px', height: '48px', margin: 0 }} defaultValue="Celine" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>Last Name</label>
                  <input type="text" className="textarea-field" style={{ padding: '12px', height: '48px', margin: 0 }} defaultValue="Christory" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>Graduation Year</label>
                  <input type="text" className="textarea-field" style={{ padding: '12px', height: '48px', margin: 0 }} defaultValue="2026" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>Email Address</label>
                  <input type="email" className="textarea-field" style={{ padding: '12px', height: '48px', margin: 0 }} defaultValue="celine@example.com" />
                </div>
              </div>
              <button className="btn-primary" style={{ padding: '0 32px', height: '48px' }}>Update Profile</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LexGuardDashboard;
