// LoopDetector - Detect 3+ consecutive identical tool calls
// Inspired by Agent Atlas loop_detector.py
// Auto-fires mayday on repeated identical tool calls

import { LoopDetectionResult } from './types.js';

export interface ToolCall {
  tool: string;
  argsHash: string;
  timestamp: Date;
}

export class LoopDetector {
  private threshold: number;
  private recentCalls: ToolCall[] = [];
  private maxHistory: number;

  constructor(threshold: number = 3, maxHistory: number = 50) {
    this.threshold = threshold;
    this.maxHistory = maxHistory;
  }

  /**
   * Record a tool call and check for loops
   */
  recordCall(tool: string, args: Record<string, unknown>): LoopDetectionResult {
    const argsHash = this.hashArgs(args);
    const now = new Date();

    // Add to history
    this.recentCalls.push({
      tool,
      argsHash,
      timestamp: now,
    });

    // Trim history
    if (this.recentCalls.length > this.maxHistory) {
      this.recentCalls = this.recentCalls.slice(-this.maxHistory);
    }

    // Check for consecutive identical calls
    return this.checkForLoop();
  }

  /**
   * Check for consecutive identical calls
   */
  private checkForLoop(): LoopDetectionResult {
    if (this.recentCalls.length < this.threshold) {
      return { loop: false, callCount: 0 };
    }

    // Get the last N calls
    const lastN = this.recentCalls.slice(-this.threshold);
    
    // Check if all are identical
    const firstCall = lastN[0];
    const allIdentical = lastN.every(
      call => call.tool === firstCall.tool && call.argsHash === firstCall.argsHash
    );

    if (allIdentical) {
      const callCount = this.countConsecutiveIdentical();
      
      return {
        loop: true,
        callCount,
        mayday: this.generateMayday(firstCall.tool, callCount),
      };
    }

    return { loop: false, callCount: 0 };
  }

  /**
   * Count consecutive identical calls at the end
   */
  private countConsecutiveIdentical(): number {
    if (this.recentCalls.length === 0) {
      return 0;
    }

    const lastCall = this.recentCalls[this.recentCalls.length - 1];
    let count = 0;

    for (let i = this.recentCalls.length - 1; i >= 0; i--) {
      const call = this.recentCalls[i];
      if (call.tool === lastCall.tool && call.argsHash === lastCall.argsHash) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * Generate a mayday message
   */
  private generateMayday(tool: string, count: number): string {
    const messages = [
      `LOOP DETECTED: ${tool} called ${count} times consecutively with identical arguments.`,
      `MAYDAY: You are stuck in a loop! ${tool} has been called ${count} times with the same parameters.`,
      `WARNING: Repeated tool call detected. ${tool} (${count}x identical calls). Change approach immediately.`,
    ];

    const message = messages[Math.floor(Math.random() * messages.length)];
    
    return `${message}\n\nYou MUST:\n1. Stop calling ${tool} with the same arguments\n2. Analyze why the previous calls didn't work\n3. Try a completely different approach\n4. If needed, read files or ask for clarification`;
  }

  /**
   * Hash arguments for comparison
   */
  private hashArgs(args: Record<string, unknown>): string {
    // Simple deterministic hash
    const sorted = Object.keys(args)
      .sort()
      .reduce((acc, key) => {
        acc[key] = args[key];
        return acc;
      }, {} as Record<string, unknown>);

    return JSON.stringify(sorted);
  }

  /**
   * Clear history (e.g., when session changes)
   */
  clearHistory(): void {
    this.recentCalls = [];
  }

  /**
   * Get recent call history
   */
  getHistory(): ToolCall[] {
    return [...this.recentCalls];
  }

  /**
   * Get stats about recent calls
   */
  getStats(): { totalCalls: number; uniqueTools: number; mostCalledTool: string | null } {
    const toolCounts = new Map<string, number>();
    
    for (const call of this.recentCalls) {
      toolCounts.set(call.tool, (toolCounts.get(call.tool) ?? 0) + 1);
    }

    let mostCalledTool: string | null = null;
    let maxCount = 0;
    
    for (const [tool, count] of toolCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCalledTool = tool;
      }
    }

    return {
      totalCalls: this.recentCalls.length,
      uniqueTools: toolCounts.size,
      mostCalledTool,
    };
  }
}
