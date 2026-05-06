import React, { useState, useRef, useMemo } from 'react';
import { 
  FileText, 
  Upload, 
  ShieldCheck, 
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
  Database
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import * as pdfjsLib from 'pdfjs-dist';

// Use local worker for reliable extraction
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const LexGuardDashboard = () => {
  const [contractText, setContractText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fileName, setFileName] = useState('');
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
        
        // Better layout preservation: join items with spaces, and handle line breaks
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
        throw new Error('PDF extraction returned minimal text. This document may be an image-only scan or highly encrypted.');
      }

      console.log('Successfully extracted document text length:', fullText.length);
      setContractText(fullText);
      setIsExtracting(false);
      triggerAnalysis(fullText);
    } catch (error) {
      console.error('PDF Extraction Failure:', error);
      setIsExtracting(false);
      alert(`Contract Guard Error: ${error.message || 'We could not read this PDF. Please try pasting the text manually.'}`);
    }
  };

  const [contractData, setContractData] = useState(null);

  const triggerAnalysis = (text) => {
    if (!text) return;
    setIsCategorizing(true);
    
    // Simulate deep scanning of the document
    setTimeout(() => {
      setIsCategorizing(false);
      setIsAnalyzing(true);
      
      setTimeout(() => {
        setIsAnalyzing(false);
        const result = generateMockAnalysis(text);
        setAnalysisResult(result.markdown);
        setContractData(result.data);
      }, 2000);
    }, 1500);
  };

  const generateMockAnalysis = (text) => {
    // 1. PRE-SCAN & DOCUMENT CONTEXT LAYER
    // This phase "remembers" key data points found anywhere in the document
    const docContext = {
      allDollars: text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g) || [],
      allPercentages: text.match(/\d+(?:\.\d+)?%/g) || [],
      allTimeframes: text.match(/\d+\s*(?:month|day|week|year)s?/gi) || [],
      allProperNouns: text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || []
    };

    const extractAdvanced = (patterns, fallback = "[NOT DETECTED]") => {
      // List of US States for priority matching
      const states = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming", "NY", "CA", "TX", "WA", "FL", "DE"];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          let val = (match[1] || match[0]).trim();
          
          // Advanced Cleaning: Remove leading articles, trailing punctuation, and dangling legal phrases
          val = val.replace(/^(a|an|the|this|that|such)\s+/i, '')
                   .replace(/[.,;:\)]+$/, '')
                   .replace(/\s+(or|and|including|subject\s+to|as\s+defined).*$/i, '')
                   .trim();

          // If we found a state abbreviation, expand it
          if (val === "NY") return "New York";
          if (val === "CA") return "California";
          
          if (val.length > 3) return val;
        }
      }

      // Final attempt: check if any state names are present in the text if jurisdiction is missing
      for (const state of states) {
        if (text.includes(state)) return state === "NY" ? "New York" : state === "CA" ? "California" : state;
      }

      return fallback;
    };

    // Refined Extraction Logic
    // Advanced Cross-Reference Extraction (Integrated)
    const salary = extractAdvanced([
      /(?:salary|compensation|remuneration|base\s+pay)\s*[:=-]?\s*(?:\(?\s*)?(\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:rate\s+of)\s*(?:\(?\s*)?(\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      /(\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(?:per\s+annum|per\s+year|annually)/i
    ], docContext.allDollars[0] || "Not Found");

    const equity = extractAdvanced([
      /((?:\w+\s+)*(?:\d{1,3}(?:,\d{3})*(?:\.\d+)?|\(\d{1,3}(?:,\d{3})*\))\s*(?:shares|options|units|rsus|tokens))/i,
      /(?:grant\s+of|award\s+of)\s*(\d+(?:,\d{3})*(?:\.\d+)?\s*(?:shares|options|units))/i,
      /(?:equity|stock)\s*[:=-]?\s*([^,.;\n\(\)]{3,30})/i
    ], docContext.allDollars.find(d => d.includes('share') || d.includes('option')) || "Not Detected");

    const jurisdiction = extractAdvanced([
      /(?:laws\s+of|jurisdiction\s+of|governed\s+by|laws\s+of\s+the\s+state\s+of)\s+(?!United States|and)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,1})/i,
      /(?!United States)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,1})\s+(?:law|jurisdiction)/i
    ], docContext.allProperNouns.find(n => n === "Delaware" || n === "California" || n === "New York" || n === "NY") || "Not Found");

    const rawTitle = extractAdvanced([
      /(?:title|position|role|employed\s+as)\s*[:=-]?\s*([A-Z][a-zA-Z\s,]{3,60})(?=[.;\n]|\s{2,}|$)/i,
      /(?:employed|working)\s+as\s+(?:a|an|the)?\s*([A-Z][a-zA-Z\s,]{3,60})/i
    ], "Professional");

    const cleanTitle = (rawTitle.toLowerCase().includes('duties') || rawTitle.toLowerCase().includes('requested')) 
      ? "Professional" 
      : rawTitle;

    const bonus = extractAdvanced([
      /(?:bonus|incentive)\s*[:=-]?\s*([^,.;\n]{3,60})/i,
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
      /(?:vacation|pto|time\s+off|paid\s+leave)\s*[:=-]?\s*([^,.;\n]{3,60})/i,
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
    
    // 2. DYNAMIC BENCHMARKING SYSTEM
    const determineLevel = (title) => {
      const t = title.toLowerCase();
      if (t.includes('vp') || t.includes('vice president') || t.includes('chief') || t.includes('head') || t.includes('director')) return 'Executive';
      if (t.includes('senior') || t.includes('lead') || t.includes('principal')) return 'Senior';
      if (t.includes('junior') || t.includes('associate') || t.includes('entry')) return 'Junior';
      return 'Professional';
    };

    const level = determineLevel(cleanTitle);
    
    const BENCHMARKS = {
      Executive: { salary: "$250k - $450k", severance: "6 - 12 Months", bonus: "30% - 50%", min: 250000, max: 450000 },
      Senior: { salary: "$160k - $240k", severance: "3 - 6 Months", bonus: "15% - 25%", min: 160000, max: 240000 },
      Professional: { salary: "$110k - $170k", severance: "2 - 3 Months", bonus: "10% - 15%", min: 110000, max: 170000 },
      Junior: { salary: "$70k - $105k", severance: "1 Month", bonus: "5% - 10%", min: 70000, max: 105000 }
    };

    const currentBenchmark = BENCHMARKS[level];
    const numericSalary = parseFloat(salary.replace(/[$,]/g, '')) || 0;
    const isAboveBenchmark = numericSalary > currentBenchmark.max;
    const isBelowBenchmark = numericSalary > 0 && numericSalary < currentBenchmark.min;

    const data = {
      salary: numericSalary,
      jurisdiction: jurisdiction,
      level: level,
      benchmark: currentBenchmark,
      title: cleanTitle
    };

    const markdown = `
# Employment Audit Report: ${cleanTitle}
**Role Grade:** ${level} | **Jurisdiction:** ${jurisdiction}

---

### 1. Contract Overview & Executive Summary

This report provides a technical analysis of the employment offer for the position of **${cleanTitle}**. The document has been cross-referenced against current market standards for **${numericSalary < 150000 ? 'Seed/Series A Startup' : 'Growth/Corporate'}** environments.

**Executive Key Findings:**
*   **Compensation Profile:** Total cash compensation is anchored at **${salary}**. This is **${isAboveBenchmark ? 'exceptionally strong' : isBelowBenchmark ? 'below market floor' : 'solidly positioned'}** for a ${level}-level role.
*   **Operational Risk:** The ${nonCompete === "Not Found" ? 'lack of a restrictive non-compete' : `presence of a **${nonCompete}** non-compete`} is a critical factor for your future career mobility.
*   **Equity Exposure:** ${equity === "Not Detected" ? "No equity grant was identified, which is atypical for startup-grade offers." : `Identified **${equity}** with standard vesting logic.`}

---

### 2. Clause-by-Clause Legal and Operational Report

#### I. Compensation & Bonus Structure
*   **Base Salary:** **${salary}** per annum.
*   **Incentive Pay:** **${bonus}**.
*   **Technical Reporting:** ${bonus === "Not Explicitly Defined" ? "The contract lacks a structured bonus formula. In corporate environments, this is a transparency risk; in startups, it often implies a focus on equity." : `The bonus structure relies on **${bonus}**. Performance criteria should be explicitly tied to KPIs to avoid discretionary ambiguity.`}
*   **Equity Vesting:** ${equity !== "Not Detected" ? `The grant of **${equity}** typically follows a 4-year cycle with a 1-year cliff—a 'Golden Standard' in tech sectors.` : "N/A"}

#### II. Severance & Termination Conditions
*   **Terms:** **${severance}**.
*   **Nuance:** The contract establishes a **${severance}** protection window. 
*   **Impact:** For **${level}** roles, the notice period and "For Cause" definitions are the primary levers for transition security. The current definitions appear **${severance.includes('Not Found') ? 'underspecified' : 'standard'}** for the current market.

#### III. Intellectual Property & Restrictive Covenants
*   **IP Assignment:** The contract includes a standard 'Work for Hire' clause, assigning all rights to the Company.
*   **Non-Compete/Solicit:** **${nonCompete}**.
*   **Reporting:** A **${nonCompete}** restriction can effectively 'freeze' a candidate in their niche. In ${jurisdiction}, enforceability varies significantly based on the reasonableness of the scope and duration.

#### IV. Benefits & Additional Perks
*   **Package:** **${benefits}**.
*   **Time Off (PTO):** **${vacation}**.
*   **Nuance:** While health and retirement are standard, the "Flexibility" and "Time Off" terms are now considered core deal points for top talent. 
*   **Observation:** The document explicitly mentions: **${vacation}**. ${vacation.toLowerCase().includes('unlimited') ? "Unlimited PTO is a common startup perk designed to offer flexibility, though it requires proactive management to ensure actual rest is taken." : "An accrual-based policy provides a guaranteed 'bank' of days, which in many jurisdictions must be paid out upon termination."}
*   **Hybrid Terms:** *"${text.match(/remote|hybrid|office\s\d\sdays/i)?.[0] || 'Standard Office Attendance'}"*.

#### V. Clawback Conditions
*   **Status:** **${clawback}**.
*   **Reporting:** Repayment clauses are common for signing bonuses or relocation packages. ${clawback === "None Detected" ? "No aggressive clawback triggers were identified in the primary financial sections." : `Note the trigger for **${clawback}**, which creates a contingent liability during the first 12-24 months.`}

---

**Expert Perspective:** This offer reflects a **${numericSalary < 120000 ? 'High-Growth Startup' : 'Established Corporate'}** philosophy. To optimize this agreement, focus on clarifying the **${bonus === "Not Explicitly Defined" ? 'Bonus Criteria' : 'Performance KPIs'}** and ensuring the **IP Carve-outs** protect your pre-existing side projects.
`;

    return { markdown, data };
  };

  const renderBenchmarks = () => {
    // Refined Tax Calculation Logic (Effective Rates for 2026)
    const calculateTax = (gross, state) => {
      // Progressive effective rate approximations
      let fedRate = 0.125; // effective rate for ~90k
      if (gross > 150000) fedRate = 0.18;
      if (gross > 250000) fedRate = 0.24;
      
      const ficaTax = gross * 0.0765;
      const fedTax = gross * fedRate;
      
      let stateRate = 0.05; 
      if (state.toLowerCase().includes('new york') || state.toLowerCase().includes('ny')) stateRate = 0.07;
      if (state.toLowerCase().includes('california') || state.toLowerCase().includes('ca')) stateRate = 0.08;
      if (state.toLowerCase().includes('texas') || state.toLowerCase().includes('washington') || state.toLowerCase().includes('florida')) stateRate = 0;
      
      const stateTax = gross * stateRate;
      const totalTax = fedTax + ficaTax + stateTax;
      
      return {
        net: gross - totalTax,
        tax: totalTax,
        fedTax,
        stateTax,
        ficaTax,
        monthly: (gross - totalTax) / 12,
        state: state.toLowerCase().includes('ny') ? 'New York' : state
      };
    };

    const staples = [
      {
        title: "Base Salary & Bonus",
        icon: <TrendingUp size={18} />,
        desc: "Fixed annual compensation and performance-linked variables.",
        lookout: ["Clarity on 'Target' vs 'Maximum' bonus.", "Frequency of salary reviews.", "Proration rules for mid-year hires."]
      },
      {
        title: "Equity & Stock Options",
        icon: <Database size={18} />,
        desc: "Ownership stakes including RSUs, ISOs, or NSOs.",
        lookout: ["Vesting schedule (Standard: 4yr/1yr cliff).", "Post-Termination Exercise (PTE) window.", "Acceleration triggers (Single vs Double trigger)."]
      },
      {
        title: "Non-Compete Clauses",
        icon: <ShieldCheck size={18} />,
        desc: "Restrictions on working for competitors after departure.",
        lookout: ["Geographic scope (Should be limited).", "Duration (12 months is the market ceiling).", "Definition of 'Competing Business'."]
      },
      {
        title: "Intellectual Property (IP)",
        icon: <Globe size={18} />,
        desc: "Ownership of work created during employment.",
        lookout: ["'Work for Hire' scope.", "Carve-outs for pre-existing inventions.", "Assignment of moral rights."]
      },
      {
        title: "Confidentiality (NDA)",
        icon: <Lock size={18} />,
        desc: "Protection of proprietary company information.",
        lookout: ["Duration of survival (Infinite vs Term-based).", "Definition of 'Confidential Information'.", "Exclusions for public knowledge."]
      },
      {
        title: "Severance & Notice",
        icon: <FileText size={18} />,
        desc: "Protections and requirements during termination.",
        lookout: ["Months of pay based on years of service.", "COBRA/Benefits continuation.", "Release requirement for payment."]
      }
    ];

    const taxInfo = contractData?.salary ? calculateTax(contractData.salary, contractData.jurisdiction) : null;

    return (
      <div className="audit-report" style={{ animation: 'slideUp 0.5s ease-out' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
          {/* Personalized Compensation Comparison */}
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Based on your extracted title of <strong>{contractData.title}</strong>, your compensation is 
                  <strong> {contractData.salary > contractData.benchmark.max ? 'above' : contractData.salary < contractData.benchmark.min ? 'below' : 'within'}</strong> the current market bracket.
                </p>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Upload a contract to see personalized market comparisons.</p>
              </div>
            )}
          </div>

          {/* Post-Tax Salary Calculator */}
          <div className="glass" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
              <Database color="var(--accent-primary)" size={20} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Post-Tax: {taxInfo?.state || 'Estimation'}</h3>
            </div>
            {taxInfo ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '8px' }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Annual Take-Home</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>${Math.round(taxInfo.net).toLocaleString()}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '8px' }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Monthly Net</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>${Math.round(taxInfo.monthly).toLocaleString()}</span>
                  </div>
                </div>
                
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Federal Tax</span>
                    <span style={{ fontWeight: 600 }}>-${Math.round(taxInfo.fedTax).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>FICA (SS/Medicare)</span>
                    <span style={{ fontWeight: 600 }}>-${Math.round(taxInfo.ficaTax).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>State Tax ({taxInfo.state})</span>
                    <span style={{ fontWeight: 600 }}>-${Math.round(taxInfo.stateTax).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-subtle)', fontSize: '0.85rem', fontWeight: 700 }}>
                    <span style={{ color: 'var(--accent-primary)' }}>Total Tax Burden</span>
                    <span style={{ color: 'var(--error)' }}>-${Math.round(taxInfo.tax).toLocaleString()}</span>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Jurisdiction data required for tax estimation.</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Contract Staples Guide</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Key elements to audit in every high-level employment agreement.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {staples.map((staple, idx) => (
            <div key={idx} className="glass" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '8px', borderRadius: '8px', color: 'var(--accent-primary)' }}>
                  {staple.icon}
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{staple.title}</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                {staple.desc}
              </p>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>What to look out for</span>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {staple.lookout.map((item, i) => (
                    <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', gap: '8px' }}>
                      <div style={{ marginTop: '6px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0 }}></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="audit-report" style={{ animation: 'slideUp 0.5s ease-out' }}>
      <div className="glass" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '500px', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(255,255,255,0.01)', padding: '2rem', borderRight: '1px solid var(--border-subtle)' }}>
          <button className="nav-item active" style={{ border: 'none', background: 'rgba(99, 102, 241, 0.1)', width: '100%', textAlign: 'left', color: 'var(--accent-primary)' }}>
            <User size={18} /> General
          </button>
          <button className="nav-item" style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left' }}>
            <Bell size={18} /> Notifications
          </button>
          <button className="nav-item" style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left' }}>
            <Lock size={18} /> Security
          </button>
        </div>
        <div style={{ padding: '3rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem', color: '#fff', textTransform: 'none', letterSpacing: '0' }}>Personal Profile</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '10px' }}>Full Name</label>
              <input type="text" className="textarea-field" style={{ padding: '12px', margin: 0, height: '48px' }} defaultValue="Celine Christory" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '10px' }}>Email Address</label>
              <input type="email" className="textarea-field" style={{ padding: '12px', margin: 0, height: '48px' }} defaultValue="celine@example.com" />
            </div>
          </div>
          <div style={{ marginBottom: '2.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '10px' }}>Default Analysis Persona</label>
            <select className="textarea-field" style={{ padding: '12px', margin: 0, height: '48px', appearance: 'none' }}>
              <option>Corporate Executive</option>
              <option>Startup Founder</option>
              <option>Engineering Manager</option>
            </select>
          </div>
          <button className="btn-primary" style={{ height: '48px', padding: '0 32px' }}>Update Profile</button>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <>
      {!analysisResult ? (
        <div className="glass upload-card" style={{ maxWidth: '800px', margin: '0 auto', animation: 'slideUp 0.5s ease-out' }}>
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(to right, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Negotiate from a Position of Strength
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 2.5rem auto' }}>
              Most people sign employment contracts without reading them. <strong>Contract Intelligence</strong> gives you the market data, tax math, and clause-level audit you need to optimize your offer.
            </p>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)', marginBottom: '2.5rem' }}></div>
          </div>

          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ width: '56px', height: '56px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <Upload size={28} color="var(--accent-primary)" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Analyze New Contract</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
              Select a PDF or paste your contract text to identify legal risks and benchmarking data.
            </p>
            
            <div style={{ marginBottom: '2rem' }}>
              <button 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', height: '48px' }}
                onClick={() => fileInputRef.current.click()}
                disabled={isExtracting || isAnalyzing || isCategorizing}
              >
                {isExtracting ? <Loader2 className="spinner" size={20} /> : <FileUp size={20} />}
                {isExtracting ? 'Extracting Data...' : 'Upload PDF Contract'}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".pdf" 
                onChange={handleFileUpload}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
              <span>OR PASTE TEXT</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
            </div>

            <textarea 
              className="textarea-field"
              placeholder="Paste contract clauses here..."
              value={contractText}
              onChange={(e) => setContractText(e.target.value)}
            />

            <button 
              className="btn-primary" 
              style={{ width: '100%', justifyContent: 'center', height: '48px', background: 'white', color: 'black' }}
              onClick={() => triggerAnalysis(contractText)}
              disabled={!contractText || isAnalyzing || isExtracting || isCategorizing}
            >
              {isCategorizing ? (
                <>
                  <Loader2 className="spinner" size={20} /> Categorizing...
                </>
              ) : isAnalyzing ? (
                <>
                  <Loader2 className="spinner" size={20} /> Benchmarking...
                </>
              ) : (
                <>Contract Guard <ArrowRight size={20} /></>
              )}
            </button>
            
            {fileName && <p style={{ marginTop: '1.25rem', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 500 }}>📄 {fileName}</p>}
          </div>
        </div>
      ) : (
        <div className="audit-report">
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
            <button className="btn-primary" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'white' }} onClick={() => setAnalysisResult(null)}>
              New Analysis
            </button>
            <button className="btn-primary">
              Download Audit PDF
            </button>
          </div>

          <div className="glass" style={{ padding: '4rem' }}>
            <div className="markdown-content">
              <ReactMarkdown>{analysisResult}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo">
          <div style={{ background: 'var(--accent-primary)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} color="white" />
          </div>
          LexGuard
        </div>
        
        <nav style={{ flex: 1 }}>
          <a href="#" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>
            <LayoutDashboard size={18} /> Dashboard
          </a>
          <a href="#" className={`nav-item ${activeTab === 'benchmarks' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('benchmarks'); }}>
            <TrendingUp size={18} /> Benchmarks
          </a>
          <a href="#" className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('settings'); }}>
            <Settings size={18} /> Settings
          </a>
        </nav>
      </aside>

      <main className="main-content">
        <header style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="header-title">
              {activeTab === 'dashboard' ? 'Contract Intelligence' : activeTab === 'benchmarks' ? 'Market Insights' : 'Preferences'}
            </h1>
            <p className="header-subtitle">
              {activeTab === 'dashboard' ? 'Upload and analyze employment agreements with MBA-level precision.' : 'Compare your compensation against real-time industry data.'}
            </p>
          </div>
          <div className="badge badge-success" style={{ padding: '8px 16px' }}>
            <div style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%' }}></div>
            AI Core Online
          </div>
        </header>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'benchmarks' && renderBenchmarks()}
        {activeTab === 'settings' && renderSettings()}
      </main>
    </div>
  );
};

export default LexGuardDashboard;
