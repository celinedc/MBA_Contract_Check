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
import remarkGfm from 'remark-gfm';

import * as pdfjsLib from 'pdfjs-dist';

// Use local worker for reliable extraction
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { analyzeContract } from './services/contractService';


const ClauseGuardDashboard = () => {

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
  const pdfTextRef = useRef('');


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
      pdfTextRef.current = fullText;
      setIsExtracting(false);
      triggerAnalysis(fullText);

    } catch (error) {
      console.error('PDF Extraction Failure:', error);
      setIsExtracting(false);
      alert(`Contract Guard Error: ${error.message}`);
    }
  };

  const triggerAnalysis = async (text) => {
    if (!text) return;
    setIsAnalyzing(true);
    setProgress(10);
    setAnalysisStep('Sending contract to Gemini...');
    try {
      setProgress(30);
      setAnalysisStep('Reading clauses and extracting fields...');
      const result = await analyzeContract(text);
      setProgress(85);
      setAnalysisStep('Building your dashboard...');
      setAnalysisResult(result);
      setContractData(result.data);
      setProgress(100);
      setAnalysisStep('Audit Complete');
      setActiveTab('report');
    } catch (err) {
      console.error('Analysis failed:', err);
      alert(`Analysis Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
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
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Salary Post-Tax Estimation</h3>

            </div>
            {taxInfo ? (
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Take-Home Salary in *{taxInfo.state}*</span>


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
          <button className="btn-primary" onClick={() => {
            const textToAnalyze = pdfTextRef.current || contractText;
            if (textToAnalyze) triggerAnalysis(textToAnalyze);
          }} disabled={isAnalyzing || (!contractText && !pdfTextRef.current)}>
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                a.download = `ClauseGuard_Audit_Report.md`;

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
          ClauseGuard Pro

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
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>School / University</label>
                  <input type="text" className="textarea-field" style={{ padding: '12px', height: '48px', margin: 0 }} defaultValue="MIT Sloan" />
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

export default ClauseGuardDashboard;

