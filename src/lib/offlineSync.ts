import { get, set } from 'idb-keyval';

export type OfflineMutation = {
  id: string;
  type: 'ADD_PAYMENT';
  payload: any;
  createdAt: number;
};

const QUEUE_KEY = 'nivasa_offline_queue';

export const offlineSync = {
  async addToQueue(mutation: Omit<OfflineMutation, 'id' | 'createdAt'>) {
    const queue: OfflineMutation[] = (await get(QUEUE_KEY)) || [];
    const newMutation: OfflineMutation = {
      ...mutation,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    
    await set(QUEUE_KEY, [...queue, newMutation]);
    return newMutation;
  },

  async getQueue(): Promise<OfflineMutation[]> {
    return (await get(QUEUE_KEY)) || [];
  },

  async clearQueue() {
    await set(QUEUE_KEY, []);
  },

  async syncNow(processMutation: (mutation: OfflineMutation) => Promise<void>) {
    if (!navigator.onLine) return 0;
    
    const queue = await this.getQueue();
    if (queue.length === 0) return 0;

    let successCount = 0;
    const failedMutations: OfflineMutation[] = [];

    for (const mutation of queue) {
      try {
        await processMutation(mutation);
        successCount++;
      } catch (error) {
        console.error(`Failed to sync mutation ${mutation.id}:`, error);
        failedMutations.push(mutation);
      }
    }

    // Keep only failed mutations in the queue
    await set(QUEUE_KEY, failedMutations);
    return successCount;
  }
};
