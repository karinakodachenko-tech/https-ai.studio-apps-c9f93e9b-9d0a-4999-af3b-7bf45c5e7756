export interface VisualFocalPoint {
  id: string;
  label: string;
  description: string;
  xPercent: number;
  yPercent: number;
}

export interface HistoricalEra {
  eraName: string;
  timeSpan: string;
  atmosphereDescription: string;
  wireframeThemeColor: string;
}

export interface LandmarkRecognitionData {
  isRecognized: boolean;
  landmarkName: string;
  alternateNames?: string[];
  city: string;
  country: string;
  category: string;
  architecturalStyle: string;
  estimatedYearOrEra: string;
  confidence: number;
  keyVisualFeatures: string[];
  visualFocalPoints: VisualFocalPoint[];
  arNarrationPitch: string;
  historicalEras?: HistoricalEra[];
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface LandmarkHistoryData {
  landmarkName: string;
  historyReport: string;
  sources: GroundingSource[];
  searchQueries: string[];
  modelUsed: string;
}

export interface LandmarkAudioData {
  audioBase64: string;
  mimeType: string;
  voiceUsed: string;
  modelUsed: string;
}

export interface SampleLandmark {
  id: string;
  name: string;
  city: string;
  country: string;
  tagline: string;
  imageUrl: string;
}
