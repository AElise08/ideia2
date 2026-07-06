import { HistoryItem } from '../types';

// ============================================================================
// Store de histórico em localStorage — local-first, sem login. As assinaturas
// são async só por padronização (a interface HistoryStore deixa a porta aberta
// caso um dia se queira plugar outro store).
// ============================================================================

export interface HistoryStore {
  getHistory(): Promise<HistoryItem[]>;
  saveHistoryItem(item: HistoryItem): Promise<void>;
  deleteHistoryItem(id: string): Promise<void>;
  clearHistory(): Promise<void>;
}

const HISTORY_KEY = 'demosthenes_history';
const MAX_ITEMS = 50;

/** Leitura síncrona crua do histórico local. */
export const readLocalHistoryRaw = (): HistoryItem[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
};

export const clearLocalHistoryRaw = (): void => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
};

export const localHistoryStore: HistoryStore = {
  async getHistory() {
    return readLocalHistoryRaw();
  },

  async saveHistoryItem(item: HistoryItem) {
    try {
      const history = readLocalHistoryRaw();
      const updatedHistory = [item, ...history].slice(0, MAX_ITEMS);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to save history item:', error);
    }
  },

  async deleteHistoryItem(id: string) {
    try {
      const history = readLocalHistoryRaw();
      const updatedHistory = history.filter(item => item.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to delete history item:', error);
    }
  },

  async clearHistory() {
    clearLocalHistoryRaw();
  },
};
