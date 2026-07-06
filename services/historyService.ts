import { HistoryItem } from '../types';
import { localHistoryStore } from './localHistoryStore';

// ============================================================================
// Camada de histórico — 100% localStorage (Demóstenes gratuito, sem login).
//
// Mantém os mesmos nomes de função de sempre (getHistory, saveHistoryItem,
// deleteHistoryItem, clearHistory), agora delegando direto para o
// `localHistoryStore`. As assinaturas continuam async pra não mexer nas
// chamadas do App (que já usam await) e pra deixar a porta aberta caso um dia
// se queira plugar outro store.
// ============================================================================

export const getHistory = (): Promise<HistoryItem[]> => localHistoryStore.getHistory();
export const saveHistoryItem = (item: HistoryItem): Promise<void> => localHistoryStore.saveHistoryItem(item);
export const deleteHistoryItem = (id: string): Promise<void> => localHistoryStore.deleteHistoryItem(id);
export const clearHistory = (): Promise<void> => localHistoryStore.clearHistory();
