import type { MetricKey, SpeechPart } from '../types';

// Contexto compacto de MEMÓRIA (Fase 2, §4.2): resumo do histórico/perfil que o
// App monta pra o coach RECONHECER quem volta e comentar a evolução. NUNCA
// transcrições antigas — só bilhete anterior + ~5 últimas notas + foco (~200 tokens).
export interface AnalyzeContext {
  nickname?: string;
  sessionCount: number;
  focusArea?: MetricKey;
  lastCoachNote?: string;         // o bilhete anterior
  recentScores?: number[];        // p/ o coach comentar a tendência
  recurringImprovements?: string[];
  isRetry?: boolean;              // "esta é uma refação — compare com o esforço anterior"
}

// Client-side: só o tipo AnalyzeInput (sem deps externas). O prompt + cleanBase64
// vivem em api/geminiCore.ts (server-only). Isso evita trazer o @google/genai pro
// bundle do client (e que o serverless function ficasse muito pesado).
export interface AnalyzeInput {
  text?: string;
  audioBase64?: string;
  mimeType?: string;
  markers?: { label: string; timestamp: number }[];
  isProfessorMode?: boolean;
  context?: AnalyzeContext;
  // Prática de SEÇÃO: qual das 5 partes do discurso este trecho é — o modelo
  // avalia o texto COMO aquela parte (o que ela deve alcançar e se alcançou).
  sectionPart?: SpeechPart;
  // Treino de DICÇÃO: o texto-alvo do exercício (trava-língua/frase). Presente
  // só nesse modo — o modelo compara o áudio lido com este alvo.
  dictionTarget?: string;
}
