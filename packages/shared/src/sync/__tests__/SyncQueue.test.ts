import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { Note } from '../../types/index.js';
import { SyncQueue, type SyncTask } from '../SyncQueue.js';

describe('SyncQueue', () => {
  let queue: SyncQueue;
  let mockNote: Note;

  beforeEach(() => {
    queue = new SyncQueue();
    mockNote = {
      id: 'note-1',
      title: 'Test Note',
      body: 'Test content',
      created_at: Date.now(),
      updated_at: Date.now(),
      source_connector: 'obsidian',
      source_id: 'test.md',
      checksum: 'abc123',
    };
  });

  describe('enqueue', () => {
    it('should add task to queue', () => {
      const taskId = queue.enqueue('create', mockNote, 'obsidian');

      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^task-/);

      const progress = queue.getProgress();
      expect(progress.pending).toBe(1);
      expect(progress.total).toBe(1);
    });

    it('should assign default normal priority', () => {
      const taskId = queue.enqueue('create', mockNote, 'obsidian');
      const task = queue.getTask(taskId);

      expect(task?.priority).toBe('normal');
    });

    it('should respect custom priority', () => {
      const taskId = queue.enqueue('create', mockNote, 'obsidian', 'high');
      const task = queue.getTask(taskId);

      expect(task?.priority).toBe('high');
    });

    it('should sort queue by priority', () => {
      queue.enqueue('create', mockNote, 'obsidian', 'low');
      queue.enqueue('update', mockNote, 'obsidian', 'high');
      queue.enqueue('delete', mockNote, 'obsidian', 'normal');

      const tasks = queue.getTasksByStatus('pending');
      expect(tasks[0].priority).toBe('high');
      expect(tasks[1].priority).toBe('normal');
      expect(tasks[2].priority).toBe('low');
    });

    it('should maintain FIFO order within same priority', () => {
      const id1 = queue.enqueue('create', mockNote, 'obsidian', 'normal');
      const id2 = queue.enqueue('update', mockNote, 'obsidian', 'normal');
      const id3 = queue.enqueue('delete', mockNote, 'obsidian', 'normal');

      const tasks = queue.getTasksByStatus('pending');
      expect(tasks[0].id).toBe(id1);
      expect(tasks[1].id).toBe(id2);
      expect(tasks[2].id).toBe(id3);
    });
  });

  describe('run', () => {
    it('should execute tasks successfully', async () => {
      const executed: string[] = [];
      const executor = async (task: SyncTask) => {
        executed.push(task.id);
      };

      queue.enqueue('create', mockNote, 'obsidian');
      queue.enqueue('update', mockNote, 'obsidian');

      const progress = await queue.run(executor);

      expect(executed).toHaveLength(2);
      expect(progress.completed).toBe(2);
      expect(progress.failed).toBe(0);
      expect(progress.pending).toBe(0);
    });

    it('should respect concurrency limit', async () => {
      const concurrentQueue = new SyncQueue({ maxConcurrent: 2 });
      let activeCount = 0;
      let maxConcurrent = 0;

      const executor = async (task: SyncTask) => {
        activeCount++;
        maxConcurrent = Math.max(maxConcurrent, activeCount);
        await new Promise(resolve => setTimeout(resolve, 50));
        activeCount--;
      };

      for (let i = 0; i < 5; i++) {
        concurrentQueue.enqueue('create', mockNote, 'obsidian');
      }

      await concurrentQueue.run(executor);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should retry failed tasks', async () => {
      const retryQueue = new SyncQueue({ maxRetries: 2, retryDelay: 10 });
      let attempts = 0;

      const executor = async (task: SyncTask) => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
      };

      retryQueue.enqueue('create', mockNote, 'obsidian');
      const progress = await retryQueue.run(executor);

      expect(attempts).toBe(2);
      expect(progress.completed).toBe(1);
      expect(progress.failed).toBe(0);
    });

    it('should fail task after max retries', async () => {
      const retryQueue = new SyncQueue({ maxRetries: 2, retryDelay: 10 });

      const executor = async (task: SyncTask) => {
        throw new Error('Persistent failure');
      };

      retryQueue.enqueue('create', mockNote, 'obsidian');
      const progress = await retryQueue.run(executor);

      expect(progress.completed).toBe(0);
      expect(progress.failed).toBe(1);

      const failed = retryQueue.getTasksByStatus('failed');
      expect(failed[0].error).toBe('Persistent failure');
      expect(failed[0].retryCount).toBe(2);
    });

    it('should apply exponential backoff', async () => {
      const retryQueue = new SyncQueue({
        maxRetries: 3,
        retryDelay: 100,
        retryBackoff: 2,
      });

      const timestamps: number[] = [];
      let attempts = 0;

      const executor = async (task: SyncTask) => {
        timestamps.push(Date.now());
        attempts++;
        if (attempts < 3) {
          throw new Error('Retry test');
        }
      };

      retryQueue.enqueue('create', mockNote, 'obsidian');
      await retryQueue.run(executor);

      // Check delays are increasing (100ms, 200ms)
      if (timestamps.length >= 2) {
        const delay1 = timestamps[1] - timestamps[0];
        expect(delay1).toBeGreaterThanOrEqual(90); // Allow 10ms tolerance
      }
      if (timestamps.length >= 3) {
        const delay2 = timestamps[2] - timestamps[1];
        expect(delay2).toBeGreaterThanOrEqual(190);
      }
    });
  });

  describe('getProgress', () => {
    it('should track progress correctly', () => {
      queue.enqueue('create', mockNote, 'obsidian');
      queue.enqueue('update', mockNote, 'obsidian');
      queue.enqueue('delete', mockNote, 'obsidian');

      const progress = queue.getProgress();

      expect(progress.total).toBe(3);
      expect(progress.pending).toBe(3);
      expect(progress.running).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.failed).toBe(0);
    });

    it('should update progress during execution', async () => {
      const progressUpdates: number[] = [];

      queue.onProgress(() => {
        progressUpdates.push(queue.getProgress().completed);
      });

      queue.enqueue('create', mockNote, 'obsidian');
      queue.enqueue('update', mockNote, 'obsidian');

      await queue.run(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(progressUpdates).toContain(1);
      expect(progressUpdates).toContain(2);
    });
  });

  describe('getTask', () => {
    it('should retrieve task by ID', () => {
      const taskId = queue.enqueue('create', mockNote, 'obsidian');
      const task = queue.getTask(taskId);

      expect(task).toBeDefined();
      expect(task?.id).toBe(taskId);
      expect(task?.operation).toBe('create');
    });

    it('should return undefined for non-existent task', () => {
      const task = queue.getTask('non-existent');
      expect(task).toBeUndefined();
    });
  });

  describe('getTasksByStatus', () => {
    it('should filter tasks by pending status', () => {
      queue.enqueue('create', mockNote, 'obsidian');
      queue.enqueue('update', mockNote, 'obsidian');

      const pending = queue.getTasksByStatus('pending');
      expect(pending).toHaveLength(2);
    });

    it('should filter tasks by completed status', async () => {
      queue.enqueue('create', mockNote, 'obsidian');
      await queue.run(async () => {});

      const completed = queue.getTasksByStatus('completed');
      expect(completed).toHaveLength(1);
    });

    it('should filter tasks by failed status', async () => {
      queue.enqueue('create', mockNote, 'obsidian');
      await queue.run(async () => {
        throw new Error('Test failure');
      });

      const failed = queue.getTasksByStatus('failed');
      expect(failed).toHaveLength(1);
    });
  });

  describe('getTasksByConnector', () => {
    it('should filter tasks by connector', () => {
      queue.enqueue('create', mockNote, 'obsidian');
      queue.enqueue('create', mockNote, 'notion');
      queue.enqueue('create', mockNote, 'obsidian');

      const obsidianTasks = queue.getTasksByConnector('obsidian');
      expect(obsidianTasks).toHaveLength(2);

      const notionTasks = queue.getTasksByConnector('notion');
      expect(notionTasks).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should clear completed and failed tasks', async () => {
      queue.enqueue('create', mockNote, 'obsidian');
      await queue.run(async () => {});

      queue.clear();

      const completed = queue.getTasksByStatus('completed');
      const failed = queue.getTasksByStatus('failed');

      expect(completed).toHaveLength(0);
      expect(failed).toHaveLength(0);
    });

    it('should not clear pending tasks', () => {
      queue.enqueue('create', mockNote, 'obsidian');
      queue.clear();

      const pending = queue.getTasksByStatus('pending');
      expect(pending).toHaveLength(1);
    });
  });

  describe('cancelPending', () => {
    it('should cancel all pending tasks', () => {
      queue.enqueue('create', mockNote, 'obsidian');
      queue.enqueue('update', mockNote, 'obsidian');
      queue.enqueue('delete', mockNote, 'obsidian');

      const cancelled = queue.cancelPending();

      expect(cancelled).toBe(3);
      expect(queue.getProgress().pending).toBe(0);
    });

    it('should return count of cancelled tasks', () => {
      queue.enqueue('create', mockNote, 'obsidian');
      const count = queue.cancelPending();

      expect(count).toBe(1);
    });
  });

  describe('retryFailed', () => {
    it('should retry all failed tasks', async () => {
      queue.enqueue('create', mockNote, 'obsidian');

      let shouldFail = true;
      await queue.run(async () => {
        if (shouldFail) {
          throw new Error('Test failure');
        }
      });

      expect(queue.getProgress().failed).toBe(1);

      shouldFail = false;
      const retried = queue.retryFailed();
      await queue.run(async () => {});

      expect(retried).toBe(1);
      expect(queue.getProgress().failed).toBe(0);
      expect(queue.getProgress().completed).toBe(1);
    });

    it('should reset retry count', async () => {
      const retryQueue = new SyncQueue({ maxRetries: 1, retryDelay: 10 });
      retryQueue.enqueue('create', mockNote, 'obsidian');

      await retryQueue.run(async () => {
        throw new Error('Test failure');
      });

      const failedTask = retryQueue.getTasksByStatus('failed')[0];
      expect(failedTask.retryCount).toBeGreaterThan(0);

      retryQueue.retryFailed();
      const retriedTask = retryQueue.getTask(failedTask.id);
      expect(retriedTask?.retryCount).toBe(0);
    });
  });

  describe('onProgress', () => {
    it('should notify listeners of task updates', async () => {
      const updates: SyncTask[] = [];
      const unsubscribe = queue.onProgress(task => {
        updates.push(task);
      });

      queue.enqueue('create', mockNote, 'obsidian');
      await queue.run(async () => {});

      expect(updates.length).toBeGreaterThan(0);
      expect(updates.some(u => u.status === 'running')).toBe(true);
      expect(updates.some(u => u.status === 'completed')).toBe(true);

      unsubscribe();
    });

    it('should allow unsubscribing', async () => {
      const updates: SyncTask[] = [];
      const unsubscribe = queue.onProgress(task => {
        updates.push(task);
      });

      unsubscribe();

      queue.enqueue('create', mockNote, 'obsidian');
      await queue.run(async () => {});

      expect(updates).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should calculate statistics', async () => {
      queue.enqueue('create', mockNote, 'obsidian');
      queue.enqueue('update', mockNote, 'notion');
      queue.enqueue('delete', mockNote, 'obsidian');

      await queue.run(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const stats = queue.getStats();

      expect(stats.totalProcessed).toBe(3);
      expect(stats.successRate).toBe(1);
      expect(stats.byOperation.create).toBe(1);
      expect(stats.byOperation.update).toBe(1);
      expect(stats.byOperation.delete).toBe(1);
      expect(stats.byConnector.obsidian).toBe(2);
      expect(stats.byConnector.notion).toBe(1);
    });

    it('should calculate average completion time', async () => {
      queue.enqueue('create', mockNote, 'obsidian');
      queue.enqueue('update', mockNote, 'obsidian');

      await queue.run(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const stats = queue.getStats();

      expect(stats.averageCompletionTime).toBeGreaterThan(0);
      expect(stats.averageCompletionTime).toBeGreaterThanOrEqual(40);
    });

    it('should calculate success rate', async () => {
      queue.enqueue('create', mockNote, 'obsidian');
      queue.enqueue('update', mockNote, 'obsidian');

      let shouldFail = false;
      await queue.run(async () => {
        if (shouldFail) {
          throw new Error('Test failure');
        }
        shouldFail = true;
      });

      const stats = queue.getStats();

      expect(stats.totalProcessed).toBe(2);
      expect(stats.successRate).toBe(0.5);
    });
  });

  describe('edge cases', () => {
    it('should handle empty queue', async () => {
      const progress = await queue.run(async () => {});

      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
    });

    it('should handle concurrent enqueue during execution', async () => {
      queue.enqueue('create', mockNote, 'obsidian');

      const runPromise = queue.run(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        // Enqueue while running
        queue.enqueue('update', mockNote, 'obsidian');
      });

      await runPromise;

      // Second task should still be pending
      expect(queue.getProgress().pending).toBe(1);
    });

    it('should handle listener errors gracefully', async () => {
      queue.onProgress(() => {
        throw new Error('Listener error');
      });

      queue.enqueue('create', mockNote, 'obsidian');

      // Should not throw
      await expect(queue.run(async () => {})).resolves.toBeDefined();
    });
  });
});
