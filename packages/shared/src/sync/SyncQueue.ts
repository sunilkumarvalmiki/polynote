/**
 * SyncQueue - Priority-based work queue for sync operations
 *
 * Manages sync tasks with priorities, concurrency limits, retry logic,
 * and progress tracking for bidirectional note synchronization.
 */

import type { Note } from '../types/index.js';

export type SyncOperation = 'create' | 'update' | 'delete' | 'conflict';
export type SyncPriority = 'high' | 'normal' | 'low';
export type SyncStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';

export interface SyncTask {
  id: string;
  operation: SyncOperation;
  priority: SyncPriority;
  connector: string;
  note: Note;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface SyncQueueConfig {
  maxConcurrent: number;
  maxRetries: number;
  retryDelay: number;
  retryBackoff: number;
}

export interface SyncProgress {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  retrying: number;
}

/**
 * Priority-based sync queue with retry and concurrency management
 */
export class SyncQueue {
  private queue: SyncTask[] = [];
  private running: Map<string, SyncTask> = new Map();
  private retrying: Set<string> = new Set(); // Track tasks being retried
  private completed: SyncTask[] = [];
  private failed: SyncTask[] = [];

  private config: SyncQueueConfig = {
    maxConcurrent: 5,
    maxRetries: 3,
    retryDelay: 1000,
    retryBackoff: 2,
  };

  private taskIdCounter = 0;
  private listeners: Set<(task: SyncTask) => void> = new Set();

  constructor(config?: Partial<SyncQueueConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Add a sync task to the queue
   */
  enqueue(
    operation: SyncOperation,
    note: Note,
    connector: string,
    priority: SyncPriority = 'normal'
  ): string {
    const task: SyncTask = {
      id: this.generateTaskId(),
      operation,
      priority,
      connector,
      note,
      status: 'pending',
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      createdAt: Date.now(),
    };

    this.queue.push(task);
    this.sortQueue();

    return task.id;
  }

  /**
   * Process the queue with concurrency control
   */
  async run(executor: (task: SyncTask) => Promise<void>): Promise<SyncProgress> {
    // Track tasks that were present at run() start to prevent infinite loops from concurrent enqueues
    const initialTaskIds = new Set(this.queue.map(t => t.id));

    const runLoop = async () => {
      // Track if we should continue processing - stops when all initial tasks are done
      const shouldContinue = () => {
        // Continue if there are running tasks
        if (this.running.size > 0) return true;
        // Continue if there are retrying tasks
        if (this.retrying.size > 0) return true;
        // Continue if there are pending initial tasks
        const hasPendingInitialTasks = this.queue.some(t => initialTaskIds.has(t.id));
        return hasPendingInitialTasks;
      };

      while (shouldContinue()) {
        // Wait if at max concurrency
        while (this.running.size >= this.config.maxConcurrent && this.hasWork()) {
          await this.sleep(10);
        }

        // Get next task from queue
        let task = null;
        for (let i = 0; i < this.queue.length; i++) {
          if (initialTaskIds.has(this.queue[i].id)) {
            task = this.queue.splice(i, 1)[0];
            break;
          }
        }

        if (!task) {
          // No initial tasks left, but might have running/retrying tasks
          await this.sleep(10);
          continue;
        }

        // Execute task asynchronously (don't await to allow concurrent execution)
        this.executeTask(task, executor).catch(error => {
          console.error(`Task ${task.id} failed:`, error);
        });

        // Small delay to allow status changes to propagate and listeners to capture them
        await this.sleep(10);
      }

      // Wait for all running tasks to complete
      while (this.running.size > 0) {
        await this.sleep(10);
      }
    };

    await runLoop();
    return this.getProgress();
  }

  /**
   * Execute a single task with retry logic
   */
  private async executeTask(
    task: SyncTask,
    executor: (task: SyncTask) => Promise<void>
  ): Promise<void> {
    task.status = 'running';
    task.startedAt = Date.now();
    this.running.set(task.id, task);
    this.notifyListeners(task);

    // Small delay to ensure listeners can process the 'running' status
    await this.sleep(1);

    try {
      await executor(task);

      // Success
      task.status = 'completed';
      task.completedAt = Date.now();
      this.completed.push(task);
      this.running.delete(task.id);
      this.notifyListeners(task);
    } catch (error) {
      // Failure - retry if possible
      task.retryCount++;

      if (task.retryCount < task.maxRetries) {
        task.status = 'retrying';
        task.error = error instanceof Error ? error.message : String(error);
        this.running.delete(task.id);
        this.retrying.add(task.id); // Mark as retrying
        this.notifyListeners(task);

        // Calculate exponential backoff delay
        const delay =
          this.config.retryDelay * Math.pow(this.config.retryBackoff, task.retryCount - 1);
        await this.sleep(delay);

        // Re-queue with same priority
        task.status = 'pending';
        this.queue.push(task);
        this.sortQueue();
        this.retrying.delete(task.id); // No longer retrying
      } else {
        // Max retries exceeded
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
        task.completedAt = Date.now();
        this.failed.push(task);
        this.running.delete(task.id);
        this.notifyListeners(task);
      }
    }
  }

  /**
   * Sort queue by priority (high > normal > low)
   */
  private sortQueue(): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 };

    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      // Same priority - FIFO by creation time
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Check if there's work to do
   */
  private hasWork(): boolean {
    return this.queue.length > 0;
  }

  /**
   * Get current progress
   */
  getProgress(): SyncProgress {
    return {
      total: this.queue.length + this.running.size + this.completed.length + this.failed.length,
      pending: this.queue.length,
      running: this.running.size,
      completed: this.completed.length,
      failed: this.failed.length,
      retrying: this.queue.filter(t => t.retryCount > 0).length,
    };
  }

  /**
   * Get task by ID
   */
  getTask(id: string): SyncTask | undefined {
    return (
      this.queue.find(t => t.id === id) ||
      this.running.get(id) ||
      this.completed.find(t => t.id === id) ||
      this.failed.find(t => t.id === id)
    );
  }

  /**
   * Get all tasks with specific status
   */
  getTasksByStatus(status: SyncStatus): SyncTask[] {
    switch (status) {
      case 'pending':
        return [...this.queue];
      case 'running':
        return Array.from(this.running.values());
      case 'completed':
        return [...this.completed];
      case 'failed':
        return [...this.failed];
      case 'retrying':
        return this.queue.filter(t => t.retryCount > 0);
      default:
        return [];
    }
  }

  /**
   * Get all tasks for a specific connector
   */
  getTasksByConnector(connector: string): SyncTask[] {
    return [
      ...this.queue.filter(t => t.connector === connector),
      ...Array.from(this.running.values()).filter(t => t.connector === connector),
      ...this.completed.filter(t => t.connector === connector),
      ...this.failed.filter(t => t.connector === connector),
    ];
  }

  /**
   * Clear completed and failed tasks
   */
  clear(): void {
    this.completed = [];
    this.failed = [];
  }

  /**
   * Cancel all pending tasks
   */
  cancelPending(): number {
    const count = this.queue.length;
    this.queue = [];
    return count;
  }

  /**
   * Retry all failed tasks
   */
  retryFailed(): number {
    const count = this.failed.length;

    this.failed.forEach(task => {
      task.status = 'pending';
      task.retryCount = 0;
      task.error = undefined;
      this.queue.push(task);
    });

    this.failed = [];
    this.sortQueue();

    return count;
  }

  /**
   * Add progress listener
   */
  onProgress(listener: (task: SyncTask) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of task update
   */
  private notifyListeners(task: SyncTask): void {
    this.listeners.forEach(listener => {
      try {
        // Pass a shallow copy to preserve task state at notification time
        listener({ ...task });
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task-${++this.taskIdCounter}-${Date.now()}`;
  }

  /**
   * Sleep helper for async operations
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    averageCompletionTime: number;
    successRate: number;
    totalProcessed: number;
    byOperation: Record<SyncOperation, number>;
    byConnector: Record<string, number>;
  } {
    const allTasks = [...this.completed, ...this.failed];

    const completionTimes = this.completed
      .filter(t => t.startedAt && t.completedAt)
      .map(t => t.completedAt! - t.startedAt!);

    const averageCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

    const successRate = allTasks.length > 0 ? this.completed.length / allTasks.length : 0;

    const byOperation: Record<SyncOperation, number> = {
      create: 0,
      update: 0,
      delete: 0,
      conflict: 0,
    };

    const byConnector: Record<string, number> = {};

    allTasks.forEach(task => {
      byOperation[task.operation]++;
      byConnector[task.connector] = (byConnector[task.connector] || 0) + 1;
    });

    return {
      averageCompletionTime,
      successRate,
      totalProcessed: allTasks.length,
      byOperation,
      byConnector,
    };
  }
}
