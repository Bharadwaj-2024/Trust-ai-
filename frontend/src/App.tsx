import { useState, useEffect, useRef } from 'react';
import {
  Shield,
  FileSearch,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clipboard,
  ClipboardCheck,
  Mic,
  MicOff,
  BarChart3,
  Clock,
  TrendingUp,
  IndianRupee,
  History,
  Loader2,
  Search,
  Sun,
  Moon,
  X
} from 'lucide-react';
import { analyzeContent, getStats } from './api';
import {
  AnalyzeResponse,
  HistoryEntry,
  DashboardStats,
  ContextType,
  CONTEXT_OPTIONS
} from './types';

function App() {
  // Form state
  const [answerText, setAnswerText] = useState('');
  const [contextType, setContextType] = useState<ContextType>('legal');
  const [voiceMode, setVoiceMode] = useState(false);
  
  // Results state
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // History & stats (store full results)
  const [history, setHistory] = useState<(HistoryEntry & { fullResult?: AnalyzeResponse })[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<(HistoryEntry & { fullResult?: AnalyzeResponse }) | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    checksToday: 0,
    highRiskPercentage: 0,
    estimatedFinesAvoided: 0
  });
  
  // UI state
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Voice capture state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Load stats on mount and initialize theme
  useEffect(() => {
    getStats().then(setStats).catch(console.error);
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('vibetrust-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('vibetrust-theme', newTheme);
  };

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setAnswerText(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access in your browser settings.');
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current?.start();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  // Toggle voice listening
  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setAnswerText('');
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!answerText.trim()) {
      setError('Please enter AI-generated content to analyze');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await analyzeContent({
        answerText,
        contextType,
        voiceMode
      });

      setResult(response);

      // Add to history with full result
      const historyEntry: HistoryEntry & { fullResult?: AnalyzeResponse } = {
        timestamp: response.timestamp,
        contextType,
        label: response.label,
        score: response.score,
        inputPreview: answerText.slice(0, 40) + (answerText.length > 40 ? '...' : ''),
        voiceMode,
        fullResult: response
      };

      setHistory(prev => [historyEntry, ...prev].slice(0, 10));

      // Update stats
      setStats(prev => ({
        checksToday: prev.checksToday + 1,
        highRiskPercentage: response.label === 'Low' 
          ? Math.round(((prev.highRiskPercentage * prev.checksToday / 100) + 1) / (prev.checksToday + 1) * 100)
          : Math.round((prev.highRiskPercentage * prev.checksToday / 100) / (prev.checksToday + 1) * 100),
        estimatedFinesAvoided: prev.estimatedFinesAvoided + (
          response.label === 'Low' ? 50000 : response.label === 'Medium' ? 10000 : 0
        )
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // Copy report to clipboard
  const handleCopyReport = () => {
    if (!result) return;

    const report = `VibeTrust AI Guardian - Trust Analysis Report
============================================
Trust Score: ${result.score}/100 (${result.label})
Timestamp: ${new Date(result.timestamp).toLocaleString()}

COMPLIANCE REPORT:
${result.complianceReport}

AUDIT/NDA NOTE:
${result.ndaauditNote}

FLAGGED ISSUES:
${result.issues.map((issue, i) => `
${i + 1}. "${issue.snippet}"
   Risk Type: ${issue.riskType}
   ${issue.explanation}
   Human should verify: ${issue.humanCheckHint}
`).join('\n')}`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get recommendation text based on label
  const getRecommendation = (label: string) => {
    switch (label) {
      case 'High': return '✓ Recommended: Approve with standard review';
      case 'Medium': return '⚠ Needs Review: Human verification recommended';
      case 'Low': return '⛔ High Risk – Escalate immediately';
      default: return '';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}k`;
    return `₹${amount}`;
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <Shield />
            </div>
            <div>
              <h1 className="app-title">VibeTrust AI Guardian</h1>
              <p className="app-subtitle">AI Trust & Compliance Checker for High-Stakes GenAI Outputs</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun /> : <Moon />}
            </button>
            <div className="header-badge">Enterprise Ready</div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Dashboard KPIs */}
        <section className="dashboard-section">
          <h2 className="dashboard-title">
            <BarChart3 size={18} />
            Risk Dashboard
          </h2>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon blue">
                <TrendingUp size={24} />
              </div>
              <div className="kpi-content">
                <h3>{stats.checksToday}</h3>
                <p>Checks run today</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon amber">
                <AlertTriangle size={24} />
              </div>
              <div className="kpi-content">
                <h3>{stats.highRiskPercentage}%</h3>
                <p>High-risk outputs detected</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon green">
                <IndianRupee size={24} />
              </div>
              <div className="kpi-content">
                <h3>{formatCurrency(stats.estimatedFinesAvoided)}</h3>
                <p>Est. fines avoided (simulated)</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Panels */}
        <div className="panels-container">
          {/* Input Panel */}
          <div className="card">
            <div className="card-header">
              <FileSearch size={20} className="card-header-icon" />
              <h2>{voiceMode ? 'Spoken Audit Query' : 'AI Content Analysis'}</h2>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Context Type</label>
                <select 
                  className="form-select"
                  value={contextType}
                  onChange={(e) => setContextType(e.target.value as ContextType)}
                >
                  {CONTEXT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div 
                className={`voice-toggle ${voiceMode ? 'active' : ''}`}
                onClick={() => {
                  if (voiceMode && isListening) {
                    recognitionRef.current?.stop();
                    setIsListening(false);
                  }
                  setVoiceMode(!voiceMode);
                }}
              >
                <div className="toggle-switch" />
                <Mic size={18} />
                <div className="toggle-label">
                  Voice Audit Mode
                </div>
              </div>

              {voiceMode && (
                <button
                  className={`voice-capture-btn ${isListening ? 'listening' : ''}`}
                  onClick={toggleListening}
                  type="button"
                >
                  {isListening ? (
                    <>
                      <MicOff size={20} />
                      <span>Stop Listening</span>
                      <div className="listening-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Mic size={20} />
                      <span>Start Voice Capture</span>
                    </>
                  )}
                </button>
              )}

              <div className="form-group">
                <label className="form-label">
                  {voiceMode ? 'Transcribed AI Response' : 'Paste AI-generated answer here'}
                </label>
                <div className="textarea-wrapper">
                  <textarea
                    className="form-textarea"
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder={voiceMode 
                      ? 'Spoken AI response will appear here after voice capture...'
                      : 'Paste the AI-generated content you want to analyze for trust, hallucinations, and compliance risks...'
                    }
                  />
                  <button 
                    className={`submit-btn-inline ${loading ? 'loading' : ''}`}
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="spinner" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search size={18} />
                        Run Trust Check
                      </>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ color: '#f87171', fontSize: '0.875rem', marginTop: '1rem' }}>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Results Panel */}
          <div className="card">
            <div className="card-header">
              <CheckCircle size={20} className="card-header-icon" />
              <h2>Analysis Results</h2>
            </div>
            <div className="card-body">
              {!result && !loading && (
                <div className="results-placeholder">
                  <Shield size={64} />
                  <p>Run a trust check to see results</p>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                    Powered by multi-model consensus simulation
                  </p>
                </div>
              )}

              {loading && (
                <div className="results-placeholder">
                  <Loader2 size={64} className="spinner" />
                  <p>Analyzing content with multi-model consensus...</p>
                </div>
              )}

              {result && !loading && (
                <>
                  {/* Trust Score Card */}
                  <div className="score-card">
                    <div className="score-display">
                      <div className={`score-number ${result.label.toLowerCase()}`}>
                        {result.score}
                      </div>
                      <div className={`score-label ${result.label.toLowerCase()}`}>
                        {result.label} Trust
                      </div>
                    </div>
                    <div className="score-recommendation">
                      {getRecommendation(result.label)}
                    </div>
                  </div>

                  {/* Issues Card */}
                  {result.issues.length > 0 && (
                    <div className="issues-card">
                      <h3 className="issues-title">
                        <AlertTriangle size={18} />
                        Flagged Risks & Possible Hallucinations
                      </h3>
                      {result.issues.map((issue, index) => (
                        <div key={index} className="issue-item">
                          <div className="issue-snippet">"{issue.snippet}"</div>
                          <div className="issue-meta">
                            <span className={`issue-type ${issue.riskType}`}>
                              {issue.riskType.replace('-', ' ')}
                            </span>
                          </div>
                          <div className="issue-explanation">{issue.explanation}</div>
                          <div className="issue-hint">
                            <strong>Human should check:</strong> {issue.humanCheckHint}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Compliance Card */}
                  <div className="compliance-card">
                    <div className="compliance-section">
                      <h4>
                        <FileText size={16} />
                        Compliance Report
                      </h4>
                      <p>{result.complianceReport}</p>
                    </div>
                    <div className="compliance-section">
                      <h4>
                        <Clipboard size={16} />
                        Audit / NDA Note
                      </h4>
                      <p>{result.ndaauditNote}</p>
                    </div>
                    <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopyReport}>
                      {copied ? <ClipboardCheck size={16} /> : <Clipboard size={16} />}
                      {copied ? 'Copied to clipboard!' : 'Copy full report'}
                    </button>
                  </div>

                  {/* Voice Transcript (if voice mode) */}
                  {voiceMode && result.voiceSummary && (
                    <div className="voice-transcript">
                      <h4>
                        <Mic size={16} />
                        Voice Audit Transcript
                      </h4>
                      <div className="transcript-line">
                        <strong>User:</strong> Is this AI answer safe to send to the regulator?
                      </div>
                      <div className="transcript-line">
                        <strong>VibeTrust:</strong> {result.voiceSummary}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* History Section */}
        <section className="history-section">
          <div className="card history-card">
            <div className="card-header">
              <History size={20} className="card-header-icon" />
              <h2>Recent Analyses</h2>
            </div>
            <table className="history-table">
              <thead>
                <tr>
                  <th><Clock size={14} style={{ marginRight: '0.5rem' }} />Time</th>
                  <th>Context</th>
                  <th>Trust Level</th>
                  <th>Input Preview</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="history-empty">
                      No analyses yet. Run your first trust check above.
                    </td>
                  </tr>
                ) : (
                  history.map((entry, index) => (
                    <tr 
                      key={index} 
                      onClick={() => setSelectedHistoryItem(entry)}
                      className="history-row-clickable"
                    >
                      <td>{formatTime(entry.timestamp)}</td>
                      <td style={{ textTransform: 'capitalize' }}>{entry.contextType}</td>
                      <td>
                        <span className={`score-label ${entry.label.toLowerCase()}`} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>
                          {entry.label}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{entry.inputPreview}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Shield size={20} />
            <span>VibeTrust AI Guardian</span>
          </div>
          <div className="footer-team">
            <span className="team-label">Developed by</span>
            <div className="team-members">
              <span className="team-member">Hari Haran</span>
              <span className="team-divider">•</span>
              <span className="team-member">Bharadwaj</span>
              <span className="team-divider">•</span>
              <span className="team-member">Ratna Keerthi</span>
            </div>
          </div>
        </div>
      </footer>

      {/* History Detail Modal */}
      {selectedHistoryItem && selectedHistoryItem.fullResult && (
        <div className="modal-overlay" onClick={() => setSelectedHistoryItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Analysis Details</h2>
              <button className="modal-close" onClick={() => setSelectedHistoryItem(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {/* Score Card */}
              <div className="modal-score-section">
                <div className={`modal-score-card ${selectedHistoryItem.fullResult.label.toLowerCase()}`}>
                  <div className="modal-score-number">{selectedHistoryItem.fullResult.score}</div>
                  <div className="modal-score-label">Trust Score</div>
                </div>
                <div className="modal-meta">
                  <div className="modal-meta-item">
                    <Clock size={16} />
                    <span>{new Date(selectedHistoryItem.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="modal-meta-item">
                    <FileSearch size={16} />
                    <span style={{ textTransform: 'capitalize' }}>{selectedHistoryItem.contextType} Context</span>
                  </div>
                  <span className={`score-label ${selectedHistoryItem.fullResult.label.toLowerCase()}`}>
                    {selectedHistoryItem.fullResult.label} Trust
                  </span>
                </div>
              </div>

              {/* Issues */}
              {selectedHistoryItem.fullResult.issues.length > 0 && (
                <div className="modal-section">
                  <h3><AlertTriangle size={18} /> Flagged Issues ({selectedHistoryItem.fullResult.issues.length})</h3>
                  <div className="modal-issues">
                    {selectedHistoryItem.fullResult.issues.map((issue, i) => (
                      <div key={i} className={`modal-issue ${issue.riskType}`}>
                        <div className="issue-header">
                          <span className={`issue-badge ${issue.riskType}`}>{issue.riskType}</span>
                        </div>
                        <blockquote>"{issue.snippet}"</blockquote>
                        <p className="issue-explanation">{issue.explanation}</p>
                        <p className="issue-hint"><strong>Human should verify:</strong> {issue.humanCheckHint}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance Report */}
              <div className="modal-section">
                <h3><FileText size={18} /> Compliance Report</h3>
                <p className="modal-report">{selectedHistoryItem.fullResult.complianceReport}</p>
              </div>

              {/* Audit Note */}
              <div className="modal-section">
                <h3><Clipboard size={18} /> Audit / NDA Note</h3>
                <p className="modal-report">{selectedHistoryItem.fullResult.ndaauditNote}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
