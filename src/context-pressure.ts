// ContextPressure - Monitor context window usage
// Inspired by Agent Atlas context_pressure.py
// Estimates token usage and signals pre-emptive flush before truncation

import { ContextPressureResult } from './types.js';

export interface Message {
  role: string;
  content: string;
}

export class ContextPressure {
  private recommendThreshold: number; // 0-1
  private demandThreshold: number; // 0-1
  private maxTokens: number;
  private lastPressure: number = 0;

  constructor(
    recommendThreshold: number = 0.65,
    demandThreshold: number = 0.85,
    maxTokens: number = 128000 // Default to 128k context window
  ) {
    this.recommendThreshold = recommendThreshold;
    this.demandThreshold = demandThreshold;
    this.maxTokens = maxTokens;
  }

  /**
   * Estimate current context pressure
   */
  tick(messages: Message[]): ContextPressureResult {
    const estimatedTokens = this.estimateTokens(messages);
    const pressure = estimatedTokens / this.maxTokens;
    
    this.lastPressure = pressure;

    let action: ContextPressureResult['action'] = 'ok';
    
    if (pressure >= this.demandThreshold) {
      action = 'urgent_flush';
    } else if (pressure >= this.recommendThreshold) {
      action = 'recommend_flush';
    }

    return {
      action,
      estimatedTokens,
      pressure,
    };
  }

  /**
   * Estimate tokens in messages
   * Uses rough estimation: 1 token ≈ 4 characters
   */
  private estimateTokens(messages: Message[]): number {
    let totalCharacters = 0;

    for (const message of messages) {
      // Message role overhead
      totalCharacters += 20;
      
      // Message content
      totalCharacters += message.content.length;
      
      // Tool calls and other metadata (rough estimate)
      totalCharacters += 100;
    }

    // System prompt (rough estimate)
    totalCharacters += 2000;

    // Convert to tokens (1 token ≈ 4 characters)
    return Math.ceil(totalCharacters / 4);
  }

  /**
   * Get last pressure reading
   */
  getLastPressure(): number {
    return this.lastPressure;
  }

  /**
   * Get pressure percentage
   */
  getPressurePercentage(): number {
    return Math.round(this.lastPressure * 100);
  }

  /**
   * Check if compaction is needed
   */
  needsCompaction(): boolean {
    return this.lastPressure >= this.recommendThreshold;
  }

  /**
   * Check if compaction is urgent
   */
  needsUrgentCompaction(): boolean {
    return this.lastPressure >= this.demandThreshold;
  }

  /**
   * Get recommended action
   */
  getRecommendedAction(): string {
    if (this.lastPressure >= this.demandThreshold) {
      return 'URGENT: Context overflow imminent. Must compact conversation immediately.';
    }
    
    if (this.lastPressure >= this.recommendThreshold) {
      return 'RECOMMEND: Context is getting full. Consider compacting conversation.';
    }
    
    return 'OK: Context usage is within normal limits.';
  }

  /**
   * Get detailed pressure info
   */
  getInfo(): {
    pressure: number;
    percentage: number;
    estimatedTokens: number;
    maxTokens: number;
    action: string;
  } {
    return {
      pressure: this.lastPressure,
      percentage: this.getPressurePercentage(),
      estimatedTokens: Math.round(this.lastPressure * this.maxTokens),
      maxTokens: this.maxTokens,
      action: this.getRecommendedAction(),
    };
  }
}
