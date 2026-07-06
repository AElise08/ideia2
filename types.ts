// As cinco métricas que o app avalia. Usada em vários lugares (foco, tendências)
// além de MetricData, por isso vive como tipo próprio.
export type MetricKey = 'clarity' | 'persuasion' | 'structure' | 'vocabulary' | 'tone';

export interface MetricData {
  clarity: number;
  persuasion: number;
  structure: number;
  vocabulary: number;
  tone: number;
}

export interface AudioAnalysis {
  pacing: string; // e.g., "Too fast", "Good", "Too slow"
  pauseUsage: string; // Feedback on pauses
  intonation: string; // Feedback on tone variation
}

export interface VocabularySuggestion {
  original: string;
  suggestion: string;
  reason: string;
}

// Correção de gramática, ortografia ou frases "mal colocadas": pega o trecho
// original e devolve uma reescrita mais clara, sempre com um tom gentil.
export interface PhrasingFix {
  original: string;
  correction: string;
  reason: string;
}

// Muletas/vícios de linguagem ("né", "tipo", "aí", "então", "assim",
// repetições...): a muleta detectada, quantas vezes apareceu (quando dá pra
// estimar) e uma dica curta pra cortar. Vale pra texto E áudio — é falando
// que a pessoa solta mais muleta.
export interface SpeechCrutch {
  term: string;   // a muleta detectada (ex.: "né")
  count?: number; // contagem aproximada, se der pra estimar
  tip: string;    // dica curta e prática pra reduzir
}

export interface SectionMarker {
  label: string;
  timestamp: number; // in seconds
}

export interface SectionAnalysis {
  sectionName: string;
  feedback: string;
  score: number;
}

// As 5 PARTES do discurso (método clássico de oratória). A linha de raciocínio
// que o app ensina, no lugar do velho "introdução/desenvolvimento/conclusão":
//   cumprimento → conquista → preparacao → desenvolvimento → conclusao.
// Valores sem acento/cedilha (chave estável) — o rótulo bonito fica na UI.
export type SpeechPart = 'cumprimento' | 'conquista' | 'preparacao' | 'desenvolvimento' | 'conclusao';

// Avaliação de UMA das 5 partes do discurso. present=false quando a parte não
// existe na fala; nesse caso score=0 e a suggestion ensina como criá-la.
export interface StructurePartAnalysis {
  part: SpeechPart;
  present: boolean;
  score: number;       // 0-100 (0 quando ausente)
  feedback: string;    // 1-2 frases específicas ao que a pessoa disse
  suggestion: string;  // 1 frase prática de como criar/melhorar essa parte
}

// Análise de DICÇÃO (exercício de leitura em voz alta comparado ao texto-alvo):
// clareza geral, ritmo e os sons/palavras em que a pessoa tropeçou, com dica.
export interface DictionTroubleSound {
  sound: string;      // o som/consoante que saiu engolido ou trocado (ex.: "R forte", "S no fim")
  words: string[];    // palavras onde tropeçou (ex.: ["rato", "roupa"])
  tip: string;        // dica curta e gentil pra treinar esse som
}

export interface DictionAnalysis {
  clarity: string;                    // 1 frase sobre a nitidez da articulação
  pacing: string;                     // 1 frase sobre o ritmo (correu? atropelou?)
  troubleSounds: DictionTroubleSound[]; // sons/palavras a treinar (vazio se saiu limpo)
}

export interface AnalysisResult {
  overallScore: number;
  // metrics é OPCIONAL: o modo dicção não devolve as 5 métricas de discurso
  // (a UI de dicção mostra o próprio bloco, não o grid). Back-compat total.
  metrics?: MetricData;
  feedback: string;
  strengths: string[];
  improvements: string[];
  rhetoricalDevices: string[];
  audioAnalysis?: AudioAnalysis;
  vocabularySuggestions?: VocabularySuggestion[];
  phrasingFixes?: PhrasingFix[];
  speechCrutches?: SpeechCrutch[]; // muletas/vícios de linguagem detectados. Opcional → back-compat com histórico antigo.
  sectionAnalysis?: SectionAnalysis[];
  // Estrutura em 5 partes (feature central): avaliação da linha de raciocínio
  // do discurso. Opcional → histórico antigo (sem esse campo) segue renderizando.
  structureAnalysis?: StructurePartAnalysis[];
  // Resultado do modo dicção — quando presente, a UI mostra o bloco de dicção
  // no lugar do grid de métricas/estrutura. Opcional → back-compat.
  dictionAnalysis?: DictionAnalysis;
  // --- Fecha o loop (Fase 1): o coach não termina num beco sem saída. ---
  // Todos opcionais → histórico antigo (sem esses campos) continua renderizando.
  nextStep?: string;        // 1 frase: o que praticar A SEGUIR.
  coachNote?: string;       // "bilhete" caloroso pra pessoa lembrar na próxima vez (memória-semente).
  focusArea?: MetricKey;    // a métrica a priorizar agora.
  topFix?: string;          // 1 frase: o ÚNICO ponto mais fraco a corrigir primeiro + o conserto acionável ("o que está te segurando agora e como resolver"). Liderar pela fraqueza. Opcional → back-compat.
  suggestedMission?: string;// uma missão concreta de treino pra próxima vez.
  progressComment?: string; // comparação com a última vez (só quando há contexto — Fase 2).
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  result: AnalysisResult;
  preview: string; // A short preview of the text or "Audio Analysis"
  // --- Campos da jornada (opcionais → back-compat com histórico antigo). ---
  sourceText?: string;                    // texto original, pra permitir "refazer" pré-preenchido.
  mode?: 'text' | 'audio' | 'diction';    // origem da análise ('diction' = treino de dicção).
  retryOf?: string;           // id do discurso original, quando esta é uma refação.
  focusAddressed?: MetricKey; // qual ponto fraco esta tentativa mirou.
}

export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}

export enum View {
  HOME = 'HOME',
  PRACTICE = 'PRACTICE',
  HISTORY = 'HISTORY',
  JOURNEY = 'JOURNEY'
}

export enum PracticeMode {
  TIMED = 'TIMED',
  SECTION = 'SECTION',
  DICTION = 'DICTION'
}

// Extend Window for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}