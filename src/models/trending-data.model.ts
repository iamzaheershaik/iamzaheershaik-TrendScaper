
export interface Keyword {
  keyword: string;
  viral_percentage: number;
}

export interface VerifiedResource {
  description: string;
  url: string;
}

export interface TrendingTopic {
  topic: string;
  keywords: Keyword[];
  hashtags: string[];
  popular_audio: string[];
  verified_resources: VerifiedResource[];
}

export interface TimeFrame {
  month: string | null;
  day: string | null;
}

export interface TrendAnalysisResult {
  platform: string;
  time_frame: TimeFrame;
  selected_topic: string;
  trending_topics: TrendingTopic[];
  error: string | null;
}
