import { AnalysisResult } from '../types';
import type { AnalyzeInput } from './geminiCore';

// Re-exporta o tipo para a UI.
export type { AnalyzeInput };

/**
 * Erro estruturado do endpoint de análise: carrega o HTTP `status` e o `code`
 * do corpo (ex.: 'NETWORK') pra UI mapear a mensagem por TIPO, em vez
 * de adivinhar por texto. A `message` guarda o detalhe técnico SÓ pro console —
 * nunca deve ir crua pra tela. Tipo LOCAL deste serviço (não vive em types.ts).
 */
export class AnalyzeError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, opts: { status?: number; code?: string } = {}) {
    super(message);
    this.name = 'AnalyzeError';
    this.status = opts.status;
    this.code = opts.code;
  }
}

/**
 * Envia o discurso para a API server-side (`/api/analyze`) que fala com o
 * Google Gemini. A chave da API nunca é exposta ao client. Rota aberta
 * (Demóstenes gratuito): sem login nem gate de pagamento.
 */
export const analyzeSpeech = async (input: AnalyzeInput): Promise<AnalysisResult> => {
  if (!input.text && !input.audioBase64) {
    throw new Error('Por favor, forneça texto ou grave um áudio para análise.');
  }

  let res: Response;
  try {
    res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (e: any) {
    // fetch só rejeita por falha de REDE (offline, DNS caiu etc.) — nunca por
    // status HTTP. A UI mostra a mensagem de retry amigável.
    throw new AnalyzeError(e?.message || 'network failure', { code: 'NETWORK' });
  }

  if (!res.ok) {
    // Corpo de erro estruturado do servidor: { error, code? }.
    let errBody: { error?: string; code?: string } | null = null;
    try {
      errBody = await res.json();
    } catch {
      /* corpo não-JSON (ex.: página de erro de proxy) — segue só com o status */
    }

    throw new AnalyzeError(errBody?.error || `Erro do servidor (${res.status})`, {
      status: res.status,
      code: errBody?.code,
    });
  }

  return (await res.json()) as AnalysisResult;
};
