
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GeminiService, TrendRequest } from './services/gemini.service';
import { TrendAnalysisResult } from './models/trending-data.model';

interface Platform {
  id: string;
  name: string;
  icon: string;
  selected: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private geminiService = inject(GeminiService);

  // Form State
  platforms = signal<Platform[]>([
    { id: 'instagram', name: 'Instagram', icon: 'fab fa-instagram', selected: true },
    { id: 'youtube', name: 'YouTube', icon: 'fab fa-youtube', selected: false },
    { id: 'tiktok', name: 'TikTok', icon: 'fab fa-tiktok', selected: false },
    { id: 'twitter', name: 'Twitter/X', icon: 'fab fa-twitter', selected: false },
    { id: 'threads', name: 'Threads', icon: 'fab fa-threads', selected: false },
  ]);
  topic = signal('AI videos');
  month = signal('');
  day = signal('');
  outputFormat = signal<'aggregated' | 'per-platform'>('per-platform');

  // UI/Data State
  isLoading = signal(false);
  error = signal<string | null>(null);
  results = signal<TrendAnalysisResult[] | TrendAnalysisResult | null>(null);

  isAggregatedResult = computed(() => {
    const res = this.results();
    return res !== null && !Array.isArray(res);
  });

  isPerPlatformResult = computed(() => {
    const res = this.results();
    return res !== null && Array.isArray(res);
  });
  
  hasSelection = computed(() => this.platforms().some(p => p.selected));

  togglePlatform(id: string): void {
    this.platforms.update(platforms =>
      platforms.map(p => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  }
  
  getViralBarColor(percentage: number): string {
    if (percentage > 85) return 'bg-green-500';
    if (percentage > 60) return 'bg-yellow-500';
    return 'bg-blue-500';
  }

  async analyzeTrends(): Promise<void> {
    if (!this.hasSelection()) {
        this.error.set('Please select at least one social media platform.');
        return;
    }
    
    this.isLoading.set(true);
    this.error.set(null);
    this.results.set(null);

    const request: TrendRequest = {
      platforms: this.platforms().filter(p => p.selected).map(p => p.name),
      topic: this.topic(),
      month: this.month(),
      day: this.day(),
      outputFormat: this.outputFormat(),
    };

    try {
      const data = await this.geminiService.getTrendingData(request);
      this.results.set(data);
      // Validation step
      if ((Array.isArray(data) && data.length === 0) || (!Array.isArray(data) && !data.trending_topics)) {
         this.error.set("Analysis complete, but no specific trending topics were found for your query. Try broadening your search.");
      } else {
        console.log("Validation successful: Received structured data from AI analysis.");
      }
    } catch (e: any) {
      this.error.set(e.message || 'An unknown error occurred.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
