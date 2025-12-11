// API Types for VibeTrust AI Guardian

export interface Issue {
  snippet: string;
  riskType: 'hallucination' | 'uncertain' | 'compliance-risk';
  explanation: string;
  humanCheckHint: string;
}

export interface AnalyzeRequest {
  answerText: string;
  contextType: 'legal' | 'finance' | 'compliance';
  voiceMode: boolean;
}

export interface AnalyzeResponse {
  score: number;
  label: 'High' | 'Medium' | 'Low';
  issues: Issue[];
  complianceReport: string;
  ndaauditNote: string;
  voiceSummary?: string;
  timestamp: string;
}

export interface HistoryEntry {
  timestamp: string;
  contextType: string;
  label: 'High' | 'Medium' | 'Low';
  score: number;
  inputPreview: string;
  voiceMode: boolean;
}

export interface DashboardStats {
  checksToday: number;
  highRiskPercentage: number;
  estimatedFinesAvoided: number;
}

export type ContextType = 'legal' | 'finance' | 'compliance';

export const CONTEXT_OPTIONS: { value: ContextType; label: string }[] = [
  { value: 'legal', label: 'Legal / Contract Review' },
  { value: 'finance', label: 'Financial / Audit / Risk' },
  { value: 'compliance', label: 'Policy / Regulatory Compliance' },
];
