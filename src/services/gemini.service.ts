
import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { TrendAnalysisResult } from '../models/trending-data.model';

export interface TrendRequest {
  platforms: string[];
  topic: string;
  month: string;
  day: string;
  outputFormat: 'aggregated' | 'per-platform';
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly ai: GoogleGenAI;

  constructor() {
    // IMPORTANT: The API key is injected via environment variables.
    // Do not hardcode or expose it in the frontend.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY environment variable not set.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async getTrendingData(request: TrendRequest): Promise<TrendAnalysisResult[] | TrendAnalysisResult> {
    const model = 'gemini-2.5-flash';

    const prompt = this.buildPrompt(request);
    const schema = this.buildSchema(request.outputFormat);
    
    try {
      const response = await this.ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      const jsonString = response.text.trim();
      const parsedResult = JSON.parse(jsonString);

      // The schema asks Gemini for a root object with a 'result' key.
      if (parsedResult.result) {
        return parsedResult.result;
      }
      
      throw new Error('Unexpected API response structure.');

    } catch (error) {
      console.error('Error fetching trending data from Gemini API:', error);
      throw new Error('Failed to analyze trends. The AI model may be overloaded or the request is invalid.');
    }
  }

  private buildPrompt(request: TrendRequest): string {
    return `
      Act as an expert social media trend analyst. Your task is to simulate web scraping and data aggregation to identify trending topics.
      Analyze the trends based on these parameters:
      - Platforms: ${request.platforms.join(', ')}
      - Topic/Subject: "${request.topic}"
      - Time Frame: Month: ${request.month || 'not specified'}, Day: ${request.day || 'not specified'}
      - Output Format: ${request.outputFormat}

      Your goal is to populate a JSON object based on the provided schema.
      - Identify relevant trending topics.
      - For each topic, extract key details: main keywords, main hashtags, and popular audio.
      - For each keyword, compute a 'viral_percentage' (a float between 0 and 100) indicating its potential to make content go viral. Base this on historical data and current trends.
      - Provide verification resources (links to articles, stats, or relevant posts) that justify the viral predictions.
      - If data for any platform or topic is unavailable, populate the 'error' field with a clear message.
      - Sort all lists (trending_topics, keywords, hashtags) in descending order of popularity or impact.
      - Your response must be ONLY the JSON object. Do not include any other text, explanations, or markdown.
    `;
  }

  private buildSchema(outputFormat: 'aggregated' | 'per-platform') {
    const trendAnalysisObjectSchema = {
      type: Type.OBJECT,
      properties: {
        platform: { type: Type.STRING, description: 'The social media platform name. For aggregated results, use "Aggregated".' },
        time_frame: {
          type: Type.OBJECT,
          properties: {
            month: { type: Type.STRING, nullable: true },
            day: { type: Type.STRING, nullable: true },
          },
        },
        selected_topic: { type: Type.STRING },
        trending_topics: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              keywords: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    keyword: { type: Type.STRING },
                    viral_percentage: { type: Type.NUMBER },
                  },
                },
              },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
              popular_audio: { type: Type.ARRAY, items: { type: Type.STRING } },
              verified_resources: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    url: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
        error: { type: Type.STRING, nullable: true },
      },
    };

    if (outputFormat === 'per-platform') {
      return {
        type: Type.OBJECT,
        properties: {
          result: {
            type: Type.ARRAY,
            items: trendAnalysisObjectSchema
          }
        }
      };
    } else {
       return {
        type: Type.OBJECT,
        properties: {
          result: trendAnalysisObjectSchema
        }
      };
    }
  }
}
