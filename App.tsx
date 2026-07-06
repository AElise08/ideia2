import React, { useState, useEffect, lazy, Suspense } from 'react';
import Header from './components/Header';
import InputSection from './components/InputSection';
import SpeechLine from './components/SpeechLine';
import AnalyzingOverlay from './components/AnalyzingOverlay';
import { analyzeSpeech, AnalyzeError } from './services/geminiService';
import { AnalysisResult, AppState, HistoryItem, View, PracticeMode, MetricKey, SectionMarker, SpeechPart } from './types';
import { getHistory, saveHistoryItem, deleteHistoryItem, clearHistory } from './services/historyService';
import { AlertCircle, Loader2 } from 'lucide-react';

// Tudo que NÃO faz parte do primeiro paint carrega sob demanda. O maior ganho é
// o recharts (Journey/ResultsView) sair do bundle inicial.
const ResultsView = lazy(() => import('./components/ResultsView'));
const HistoryList = lazy(() => import('./components/HistoryList'));
const PracticeSelector = lazy(() => import('./components/Practice/PracticeSelector'));
const TimedPractice = lazy(() => import('./components/Practice/TimedPractice'));
const SectionPractice = lazy(() => import('./components/Practice/SectionPractice'));
const DictionPractice = lazy(() => import('./components/Practice/DictionPractice'));
const Journey = lazy(() => import('./components/Journey'));

// Fallback padrão enquanto um chunk lazy chega.
const ViewLoader: React.FC = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
  </div>
);

// Rótulos PT-BR das métricas, pra o reconhecimento da home mostrar o foco de
// forma humana ("Foco de hoje: Clareza").
const FOCUS_LABELS: Record<MetricKey, string> = {
  clarity: 'Clareza',
  persuasion: 'Persuasão',
  structure: 'Estrutura',
  vocabulary: 'Vocabulário',
  tone: 'Tom',
};

// Tudo que a caixa de análise e os modos de prática podem enviar. Superconjunto
// das assinaturas de onAnalyze de cada componente (discurso, seção, dicção).
type AnalyzeInputUI = {
  text?: string;
  audioBase64?: string;
  mimeType?: string;
  markers?: SectionMarker[];
  isProfessorMode?: boolean;
  sectionPart?: SpeechPart;
  dictionTarget?: string;
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [practiceMode, setPracticeMode] = useState<PracticeMode | null>(null);
  const [analyzingInput, setAnalyzingInput] = useState<{ hasAudio: boolean; isProfessorMode?: boolean }>({ hasAudio: false });
  // --- Estado do loop de treino ---
  // Texto do discurso que gerou o resultado atual (pra "refazer" pré-preenchido).
  const [lastInputText, setLastInputText] = useState<string | null>(null);
  // Id do item de histórico que está na tela — a próxima refação aponta pra ele.
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  // Quando refazendo: id do discurso original + texto pra pré-preencher o InputSection.
  const [retryOfId, setRetryOfId] = useState<string | null>(null);
  const [pendingRetryText, setPendingRetryText] = useState<string | null>(null);
  // Missão que viaja do "Treinar o foco" pra dentro da prática — pra pessoa não
  // cair no seletor sem saber o que veio treinar. Limpa em nova análise / Home.
  const [pendingMission, setPendingMission] = useState<{ text: string; focusArea?: MetricKey } | null>(null);

  useEffect(() => {
    // Histórico é 100% local (sem login): lê o localStorage na entrada.
    let cancelled = false;
    getHistory().then(items => {
      if (!cancelled) setHistory(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAnalyze = async (input: AnalyzeInputUI) => {
    setAppState(AppState.ANALYZING);
    setError(null);
    setCurrentView(View.HOME); // garante voltar pra home pra mostrar o resultado
    setAnalyzingInput({ hasAudio: !!input.audioBase64, isProfessorMode: input.isProfessorMode });
    try {
      // Treino de dicção é um exercício à parte — não carrega memória do coach
      // nem entra na régua de discursos.
      const isDiction = !!input.dictionTarget;

      // Contexto de MEMÓRIA: resumo compacto do histórico atual pra o coach
      // reconhecer quem volta e comentar a evolução. Só nos discursos, e só
      // quando já há sessões. history está ordenado do mais recente pro mais antigo.
      const latest = history[0];
      const isRetry = pendingRetryText !== null || retryOfId !== null;
      const context = (!isDiction && history.length > 0)
        ? {
            sessionCount: history.length,
            focusArea: latest?.result.focusArea,
            lastCoachNote: latest?.result.coachNote,
            // últimas ~5 notas gerais, da mais antiga pra mais nova.
            recentScores: history
              .slice(0, 5)
              .map(h => h.result.overallScore)
              .reverse(),
            recurringImprovements: latest?.result.improvements?.slice(0, 3),
            isRetry,
          }
        : undefined;

      const result = await analyzeSpeech({ ...input, context });
      setAnalysisResult(result);
      setAppState(AppState.RESULTS);

      // Origem da análise: dicção > áudio > texto.
      const mode: 'text' | 'audio' | 'diction' = isDiction ? 'diction' : input.audioBase64 ? 'audio' : 'text';
      // Preview do histórico: no modo dicção, o texto-alvo lido; senão, o discurso.
      const preview = isDiction
        ? `Dicção: "${input.dictionTarget!.slice(0, 60)}${input.dictionTarget!.length > 60 ? '…' : ''}"`
        : input.text
          ? input.text.substring(0, 100) + (input.text.length > 100 ? '...' : '')
          : 'Análise de Áudio';

      const id = crypto.randomUUID();
      const newItem: HistoryItem = {
        id,
        timestamp: Date.now(),
        result,
        preview,
        sourceText: input.text,
        mode,
        // Se veio de "refazer", encadeia com o discurso original (habilita o antes/depois).
        retryOf: retryOfId ?? undefined,
        focusAddressed: result.focusArea,
      };
      await saveHistoryItem(newItem);
      setHistory(await getHistory()); // atualiza o histórico

      // Guarda o contexto pra fechar o loop: texto pra refazer, id pra encadear.
      // Só faz sentido pros discursos (dicção não tem "refação de texto").
      setLastInputText(isDiction ? null : (input.text ?? null));
      setCurrentResultId(id);
      setRetryOfId(null);       // consumido — a próxima análise só encadeia se refazer de novo.
      setPendingRetryText(null);
      setPendingMission(null);  // missão cumprida (ou substituída) — some da prática.
    } catch (err: any) {
      console.error('[demostenes] analyze error:', err);
      // Mapeia primeiro por TIPO (status/code do AnalyzeError) e só depois por
      // texto. Detalhe técnico fica SÓ no console — o usuário nunca vê stack,
      // objeto cru, nome de modelo, chave, provider ou o erro cru do Google.
      const status = err instanceof AnalyzeError ? err.status : undefined;
      const code = err instanceof AnalyzeError ? err.code : undefined;
      const raw = (err?.message || '').toString().toLowerCase();
      let friendly = 'Não foi possível concluir a análise agora. Tente novamente em instantes.';
      if (code === 'NETWORK' || /network|failed to fetch|load failed|networkerror|err_/.test(raw)) {
        friendly = 'Falha de conexão. Verifique sua internet e tente de novo — seu texto continua aqui.';
      } else if (status === 429 || /quota|rate.?limit|429|exhausted|resource.?exhausted/.test(raw)) {
        friendly = 'Estamos recebendo muitas análises no momento. Aguarde um ou dois minutos e tente de novo.';
      } else if (status === 500 || status === 503) {
        friendly = 'O serviço está indisponível no momento — tente de novo em instantes.';
      } else if (/timeout|etimedout|aborted|deadline/.test(raw)) {
        friendly = 'A análise demorou mais que o esperado. Tente novamente — se for um áudio longo, grave um trecho menor.';
      } else if (/configurada|configured|authentication|credential|oauth|api.?key|unauthenticated|unregistered|permission|401|403|invalid/.test(raw)) {
        friendly = 'O serviço de análise está indisponível no momento. Tente novamente mais tarde.';
      }
      setError(friendly);
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setAppState(AppState.IDLE);
    setError(null);
    // Discurso novo do zero: solta qualquer encadeamento de refação.
    setRetryOfId(null);
    setPendingRetryText(null);
  };

  // "Refazer e melhorar": pré-preenche o texto do discurso atual e encadeia a
  // próxima análise ao original (retryOf), pra render o antes/depois no futuro.
  const handleRetry = () => {
    setPendingRetryText(lastInputText ?? '');
    setRetryOfId(currentResultId);
    setAnalysisResult(null);
    setError(null);
    setCurrentView(View.HOME);
    setAppState(AppState.IDLE);
  };

  // "Treinar o foco": leva pro modo de prática LEVANDO a missão junto. Sem isso a
  // pessoa cai no seletor sem saber o que treinar. Lê o resultado atual antes de
  // limpá-lo; se não há missão sugerida, navega com null (como antes).
  const handleTrainWeak = () => {
    const r = analysisResult;
    setPendingMission(
      r?.suggestedMission
        ? { text: r.suggestedMission, focusArea: r.focusArea }
        : null
    );
    setCurrentView(View.PRACTICE);
    setPracticeMode(null);
    setAnalysisResult(null);
    setAppState(AppState.IDLE);
  };

  // "Ver evolução": abre a tela de Jornada (curva, tendências, marcos, antes/depois).
  const handleViewJourney = () => {
    setShowHistory(false);
    setCurrentView(View.JOURNEY);
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setAnalysisResult(item.result);
    setAppState(AppState.RESULTS);
    setShowHistory(false);
    setCurrentView(View.HOME); // volta pra home pra mostrar o resultado
    // Reabilita o loop a partir deste item: refazer pré-preenche o texto dele.
    setLastInputText(item.sourceText ?? null);
    setCurrentResultId(item.id);
    setRetryOfId(null);
    setPendingRetryText(null);
  };

  const handleHistoryDelete = async (id: string) => {
    await deleteHistoryItem(id);
    setHistory(await getHistory());
  };

  const handleHistoryClear = async () => {
    await clearHistory();
    setHistory([]);
  };

  const renderContent = () => {
    if (currentView === View.JOURNEY) {
      return (
        <Journey
          history={history}
          onSelect={handleHistorySelect}
          onDelete={handleHistoryDelete}
          onClear={handleHistoryClear}
          onBack={() => {
            setCurrentView(View.HOME);
            setAppState(AppState.IDLE);
          }}
        />
      );
    }

    if (currentView === View.PRACTICE) {
      if (practiceMode === PracticeMode.TIMED) {
        return <TimedPractice onBack={() => setPracticeMode(null)} onAnalyze={handleAnalyze} mission={pendingMission?.text} />;
      }
      if (practiceMode === PracticeMode.SECTION) {
        return <SectionPractice onBack={() => setPracticeMode(null)} onAnalyze={handleAnalyze} mission={pendingMission?.text} />;
      }
      if (practiceMode === PracticeMode.DICTION) {
        return <DictionPractice onBack={() => setPracticeMode(null)} onAnalyze={handleAnalyze} />;
      }
      return <PracticeSelector onSelectMode={setPracticeMode} mission={pendingMission?.text} />;
    }

    // Reconhecimento do retornante: undefined = visitante novo (mantém o convite
    // original); '' = retornante sem foco definido; string = foco de hoje.
    const isNewVisitor = history.length === 0;
    const returningFocusLabel: string | undefined = isNewVisitor
      ? undefined
      : (history[0]?.result.focusArea ? FOCUS_LABELS[history[0].result.focusArea] : '');

    // Home: visitante novo cai DIRETO na caixa de análise (sem landing).
    return (
      <div className="relative z-10">
        {appState === AppState.ERROR && (
          <div className="max-w-4xl mx-auto mb-8 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex flex-wrap items-center gap-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="flex-1 min-w-[12rem]">{error}</p>
            <button onClick={() => setAppState(AppState.IDLE)} className="ml-auto underline text-sm hover:text-red-300 py-1">Tentar Novamente</button>
          </div>
        )}

        {(appState === AppState.IDLE || appState === AppState.ANALYZING || appState === AppState.ERROR) && (
          <section id="analisar" className="scroll-mt-24">
            {appState === AppState.IDLE && (
              <div className="text-center mb-6 animate-fadeIn">
                {/* Progresso dotado: a jornada já tem contagem antes de digitar. */}
                <p className="text-sm uppercase tracking-widest text-lime-400 font-bold mb-2">
                  Discurso {history.length + 1} de 30
                </p>
                {/* Retornante: reconhecimento leve + foco de hoje. Visitante novo
                    (history vazio) recebe o convite original. */}
                {returningFocusLabel !== undefined ? (
                  <>
                    <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                      Bom te ver de novo 👋
                    </h3>
                    {returningFocusLabel && (
                      <p className="mt-2 text-zinc-400">
                        Foco de hoje: <span className="text-lime-400 font-semibold">{returningFocusLabel}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    Comece agora. Leva menos de um minuto.
                  </h3>
                )}
              </div>
            )}
            <InputSection
              onAnalyze={handleAnalyze}
              isAnalyzing={appState === AppState.ANALYZING}
              initialText={pendingRetryText ?? undefined}
              isRetry={pendingRetryText !== null}
              onCancelRetry={handleReset}
            />
            {/* Home parada: explica as 5 partes que o app avalia. */}
            {appState === AppState.IDLE && <SpeechLine />}
          </section>
        )}

        {appState === AppState.RESULTS && analysisResult && (
          <ResultsView
            result={analysisResult}
            onReset={handleReset}
            onRetry={handleRetry}
            onTrainWeak={handleTrainWeak}
            onViewJourney={handleViewJourney}
            canRetry={!!lastInputText}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-lime-400 selection:text-black overflow-hidden">
      {/* Overlay de análise — feedback visual GRANDE enquanto o Gemini processa. */}
      {appState === AppState.ANALYZING && (
        <AnalyzingOverlay
          hasAudio={analyzingInput.hasAudio}
          isProfessorMode={analyzingInput.isProfessorMode}
        />
      )}

      <Header
        onHistoryClick={() => setShowHistory(true)}
        onPracticeClick={() => {
          setCurrentView(View.PRACTICE);
          setPracticeMode(null);
          setAppState(AppState.IDLE);
        }}
        onHomeClick={() => {
          setCurrentView(View.HOME);
          setAppState(AppState.IDLE);
          setPendingMission(null); // volta pra home = missão descartada.
        }}
        onJourneyClick={() => {
          setShowHistory(false);
          setCurrentView(View.JOURNEY);
        }}
      />

      {showHistory && (
        <>
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowHistory(false)}
          />
          <Suspense fallback={null}>
            <HistoryList
              history={history}
              onSelect={handleHistorySelect}
              onDelete={handleHistoryDelete}
              onClear={handleHistoryClear}
              onClose={() => setShowHistory(false)}
            />
          </Suspense>
        </>
      )}

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 relative overflow-y-auto">
        {/* Elementos decorativos de fundo — cinza sutil + brilho lime. */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-zinc-800/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-lime-500/[0.06] rounded-full blur-[150px] pointer-events-none"></div>

        <Suspense fallback={<ViewLoader />}>{renderContent()}</Suspense>
      </main>

      <footer className="w-full py-8 border-t border-zinc-900 bg-black text-center text-zinc-600 text-sm font-mono">
        <p>© {new Date().getFullYear()} Demóstenes.</p>
      </footer>
    </div>
  );
};

export default App;
