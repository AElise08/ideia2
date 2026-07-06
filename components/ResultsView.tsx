import React from 'react';
import { AnalysisResult, MetricKey, SpeechPart } from '../types';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Tooltip
} from 'recharts';
import {
  Feather, Target, Mic2, Layout, BookOpen, ThumbsUp, TrendingUp, Lightbulb, Music, Pause,
  Activity, Type, Wand2, ArrowRight, Zap, Scissors, Route, CheckCircle2, Circle, Volume2,
  RotateCcw,
} from 'lucide-react';
import MetricCard from './MetricCard';
import NextStep from './NextStep';

// Rótulos PT-BR das métricas, pra nomear o foco de forma humana no destaque.
const FOCUS_LABELS: Record<MetricKey, string> = {
  clarity: 'Clareza',
  persuasion: 'Persuasão',
  structure: 'Estrutura',
  vocabulary: 'Vocabulário',
  tone: 'Tom',
};

// As 5 partes do discurso, em ORDEM canônica, com rótulo bonito + o que cada
// parte precisa alcançar (aparece na trilha de estrutura).
const PART_META: { part: SpeechPart; label: string; role: string }[] = [
  { part: 'cumprimento', label: 'Cumprimento', role: 'Saudação e apresentação' },
  { part: 'conquista', label: 'Conquista', role: 'Prender a atenção da plateia' },
  { part: 'preparacao', label: 'Preparação', role: 'Contextualizar e anunciar o tema' },
  { part: 'desenvolvimento', label: 'Desenvolvimento', role: 'Argumentos, exemplos e provas' },
  { part: 'conclusao', label: 'Conclusão', role: 'Fecho forte e apelo final' },
];

// Cor da nota de cada parte/nota, na mesma régua do resto do app.
const scoreTone = (s: number) =>
  s >= 80 ? 'text-lime-400' : s >= 55 ? 'text-yellow-400' : 'text-zinc-400';

interface ResultsViewProps {
  result: AnalysisResult;
  onReset: () => void;
  onRetry: () => void;
  onTrainWeak: () => void;
  onViewJourney: () => void;
  canRetry: boolean;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result, onReset, onRetry, onTrainWeak, onViewJourney, canRetry }) => {
  // Modo DICÇÃO: quando há dictionAnalysis, mostramos um bloco próprio (nota,
  // clareza, ritmo, sons a treinar) em vez do grid de métricas/estrutura.
  if (result.dictionAnalysis) {
    const d = result.dictionAnalysis;
    return (
      <div className="w-full animate-fadeIn pb-20 max-w-3xl mx-auto">
        {/* Nota do treino */}
        <div className="mb-6 bg-gradient-to-br from-lime-400/[0.12] to-lime-400/[0.03] border border-lime-400/30 rounded-2xl p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-lime-400/15 flex items-center justify-center ring-1 ring-lime-400/40 flex-shrink-0">
            <Volume2 className="w-7 h-7 text-lime-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-lime-400/80 font-bold">Treino de dicção</p>
            <p className="text-3xl font-bold text-white">
              {result.overallScore}<span className="text-lg text-zinc-500">/100</span>
            </p>
          </div>
        </div>

        {/* Feedback do coach */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 md:p-8 mb-6">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center">
            <Lightbulb className="w-5 h-5 text-lime-400 mr-2" /> Como saiu sua leitura
          </h3>
          <p className="text-zinc-300 leading-relaxed text-lg">{result.feedback}</p>
        </div>

        {/* Clareza + ritmo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-black/40 rounded-xl p-4 border border-zinc-800/50">
            <div className="flex items-center mb-2 text-zinc-400">
              <Feather className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium uppercase tracking-wider">Clareza</span>
            </div>
            <p className="text-white font-medium">{d.clarity}</p>
          </div>
          <div className="bg-black/40 rounded-xl p-4 border border-zinc-800/50">
            <div className="flex items-center mb-2 text-zinc-400">
              <Music className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium uppercase tracking-wider">Ritmo</span>
            </div>
            <p className="text-white font-medium">{d.pacing}</p>
          </div>
        </div>

        {/* Sons a treinar */}
        {d.troubleSounds && d.troubleSounds.length > 0 && (
          <div className="bg-zinc-900/10 border border-zinc-800 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-amber-400 mb-1 flex items-center">
              <Scissors className="w-5 h-5 mr-2" /> Sons pra treinar
            </h3>
            <p className="text-zinc-500 text-xs mb-4">Onde a boca tropeçou — repita devagar até sair limpo. 🎯</p>
            <div className="space-y-3">
              {d.troubleSounds.map((t, idx) => (
                <div key={idx} className="bg-black/20 rounded-lg p-3 border border-zinc-800/50">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-sm font-bold">
                      {t.sound}
                    </span>
                    {t.words && t.words.length > 0 && (
                      <span className="text-zinc-500 text-xs">em: {t.words.join(', ')}</span>
                    )}
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed">{t.tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pontos fortes (quando vierem) */}
        {result.strengths && result.strengths.length > 0 && (
          <div className="bg-zinc-900/10 border border-zinc-800 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <ThumbsUp className="w-5 h-5 mr-2 text-lime-400" /> O que já está bom
            </h3>
            <ul className="space-y-3">
              {result.strengths.map((item, idx) => (
                <li key={idx} className="flex items-start text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400 mt-2 mr-3 flex-shrink-0"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ações */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={onTrainWeak}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold bg-lime-400 hover:bg-lime-300 text-black transition-all shadow-lg shadow-lime-400/20"
          >
            <RotateCcw className="w-5 h-5" /> Treinar de novo
          </button>
          <button
            onClick={onViewJourney}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-lime-400/40 text-zinc-200 transition-all"
          >
            <TrendingUp className="w-5 h-5 text-lime-400" /> Ver evolução
          </button>
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-lime-400/40 text-zinc-200 transition-all"
          >
            <Mic2 className="w-5 h-5 text-lime-400" /> Analisar discurso
          </button>
        </div>
      </div>
    );
  }

  // A partir daqui é o modo discurso/seção (tem as 5 métricas). metrics é
  // opcional no tipo (por causa da dicção) — garantimos um objeto seguro.
  const metrics = result.metrics ?? { clarity: 0, persuasion: 0, structure: 0, vocabulary: 0, tone: 0 };
  const chartData = [
    { subject: 'Clareza', A: metrics.clarity, fullMark: 100 },
    { subject: 'Persuasão', A: metrics.persuasion, fullMark: 100 },
    { subject: 'Estrutura', A: metrics.structure, fullMark: 100 },
    { subject: 'Vocabulário', A: metrics.vocabulary, fullMark: 100 },
    { subject: 'Tom', A: metrics.tone, fullMark: 100 },
  ];

  // Liderar pela fraqueza: o foco (métrica mais fraca) e o conserto acionável
  // aparecem em DESTAQUE no topo. Back-compat: guardas ?. — histórico antigo
  // sem topFix/focusArea simplesmente não mostra o bloco.
  const focusLabel = result.focusArea ? FOCUS_LABELS[result.focusArea] : null;
  // O conserto: usa topFix (novo). Se faltar (histórico antigo), cai pra 1ª
  // melhoria — evita duplicar o nextStep, que já aparece no bloco de baixo.
  const fixText = result.topFix ?? result.improvements?.[0];
  const showUnlock = !!(focusLabel || fixText);

  return (
    <div className="w-full animate-fadeIn pb-20">
      {/* Liderar pela fraqueza: o que destravar AGORA, logo no topo do resultado. */}
      {showUnlock && (
        <div className="mb-8 bg-gradient-to-br from-lime-400/[0.12] to-lime-400/[0.03] border border-lime-400/30 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-lime-500/[0.10] rounded-full blur-[80px] pointer-events-none"></div>
          <div className="flex items-start gap-4 relative">
            <div className="w-11 h-11 rounded-xl bg-lime-400/15 flex items-center justify-center ring-1 ring-lime-400/40 flex-shrink-0">
              <Zap className="w-6 h-6 text-lime-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                <h3 className="text-lg font-bold text-white">O que destravar agora</h3>
                {focusLabel && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lime-400/15 border border-lime-400/30 text-lime-400 text-xs font-bold uppercase tracking-wider">
                    <Target className="w-3 h-3" /> {focusLabel}
                  </span>
                )}
              </div>
              {fixText && (
                <p className="text-zinc-100 text-lg leading-relaxed font-light">{fixText}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Radar Chart */}
        <div className="lg:col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-lime-400"></div>
          <h3 className="text-lg font-semibold text-zinc-300 mb-4 self-start w-full flex justify-between">
            <span>Perfil Retórico</span>
            <span className="text-lime-400 font-mono">{result.overallScore}/100</span>
          </h3>
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Pontuação"
                  dataKey="A"
                  stroke="#a3e635"
                  strokeWidth={2}
                  fill="#a3e635"
                  fillOpacity={0.15}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#3f6212', color: '#f4f4f5' }}
                  itemStyle={{ color: '#a3e635' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           <MetricCard
             label="Clareza"
             value={metrics.clarity}
             icon={<Feather className="w-5 h-5" />}
             description="Quão facilmente sua audiência entende sua mensagem."
           />
           <MetricCard
             label="Persuasão"
             value={metrics.persuasion}
             icon={<Target className="w-5 h-5" />}
             description="Eficácia em convencer a audiência."
           />
           <MetricCard
             label="Estrutura"
             value={metrics.structure}
             icon={<Layout className="w-5 h-5" />}
             description="Fluxo lógico e organização das ideias."
           />
           <MetricCard
             label="Vocabulário"
             value={metrics.vocabulary}
             icon={<BookOpen className="w-5 h-5" />}
             description="Riqueza e adequação da escolha de palavras."
           />
           <MetricCard
             label="Tom"
             value={metrics.tone}
             icon={<Mic2 className="w-5 h-5" />}
             description="Ressonância emocional e estilo de entrega."
           />
        </div>
      </div>

      {/* Audio Analysis Section (if available) */}
      {result.audioAnalysis && (
        <div className="mb-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Análise Vocal Detalhada
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/40 rounded-xl p-4 border border-zinc-800/50">
              <div className="flex items-center mb-2 text-zinc-400">
                <Music className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium uppercase tracking-wider">Ritmo</span>
              </div>
              <p className="text-white font-medium">{result.audioAnalysis.pacing}</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-zinc-800/50">
              <div className="flex items-center mb-2 text-zinc-400">
                <Pause className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium uppercase tracking-wider">Pausas</span>
              </div>
              <p className="text-white font-medium">{result.audioAnalysis.pauseUsage}</p>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-zinc-800/50">
              <div className="flex items-center mb-2 text-zinc-400">
                <Mic2 className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium uppercase tracking-wider">Entonação</span>
              </div>
              <p className="text-white font-medium">{result.audioAnalysis.intonation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Estrutura do discurso — a linha de raciocínio em 5 partes, como uma
          trilha: dá pra ver de relance onde o discurso está forte e o que falta. */}
      {result.structureAnalysis && result.structureAnalysis.length > 0 && (
        <div className="mb-8 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Route className="w-5 h-5 text-lime-400" />
            <h3 className="text-lg font-bold text-white">Estrutura do discurso</h3>
          </div>
          <p className="text-zinc-500 text-xs mb-6">A linha de raciocínio em 5 partes — <span className="text-lime-400">✓</span> presente, <span className="text-zinc-500">○</span> ainda falta.</p>
          <div className="space-y-1">
            {PART_META.map(({ part, label, role }, idx) => {
              const item = result.structureAnalysis!.find(s => s.part === part);
              const present = !!item?.present;
              const score = item?.score ?? 0;
              const isLast = idx === PART_META.length - 1;
              return (
                <div key={part} className="flex gap-3">
                  {/* Marcador + linha conectando as etapas */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    {present
                      ? <CheckCircle2 className="w-6 h-6 text-lime-400" />
                      : <Circle className="w-6 h-6 text-zinc-600" />}
                    {!isLast && <div className={`w-0.5 flex-1 my-1 ${present ? 'bg-lime-400/30' : 'bg-zinc-800'}`} />}
                  </div>
                  {/* Conteúdo da etapa */}
                  <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-4'}`}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-0.5">
                      <span className="text-[11px] font-mono text-zinc-600">{idx + 1}</span>
                      <h4 className="text-white font-semibold">{label}</h4>
                      {present ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded bg-black/30 ${scoreTone(score)}`}>{score}/100</span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 uppercase tracking-wider">falta</span>
                      )}
                    </div>
                    <p className="text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5">{role}</p>
                    {item?.feedback && <p className="text-zinc-300 text-sm leading-relaxed">{item.feedback}</p>}
                    {item?.suggestion && (
                      <p className="text-zinc-400 text-sm leading-relaxed mt-1.5 flex items-start gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-lime-400 mt-0.5 flex-shrink-0" />
                        <span>{item.suggestion}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analysis Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Main Feedback */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 md:p-8 h-fit">
           <h3 className="text-xl font-bold text-white mb-4 flex items-center">
             <Lightbulb className="w-6 h-6 text-lime-400 mr-2" />
             Feedback do Orador
           </h3>
           <p className="text-zinc-300 leading-relaxed text-lg">
             {result.feedback}
           </p>

           <div className="mt-8">
             <h4 className="text-sm uppercase tracking-wider text-zinc-500 font-bold mb-4">Recursos Retóricos Detectados</h4>
             <div className="flex flex-wrap gap-2">
               {result.rhetoricalDevices.length > 0 ? (
                 result.rhetoricalDevices.map((device, idx) => (
                   <span key={idx} className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-full text-sm">
                     {device}
                   </span>
                 ))
               ) : (
                 <span className="text-zinc-500 italic">Nenhum recurso específico detectado. Tente usar metáforas ou repetição.</span>
               )}
             </div>
           </div>
        </div>

        {/* Actionable Lists */}
        <div className="space-y-6">
          <div className="bg-zinc-900/10 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <ThumbsUp className="w-5 h-5 mr-2 text-lime-400" />
              Pontos Fortes
            </h3>
            <ul className="space-y-3">
              {result.strengths.map((item, idx) => (
                <li key={idx} className="flex items-start text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400 mt-2 mr-3 flex-shrink-0"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-zinc-900/10 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-zinc-400 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Áreas para Melhoria
            </h3>
            <ul className="space-y-3">
              {result.improvements.map((item, idx) => (
                <li key={idx} className="flex items-start text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-2 mr-3 flex-shrink-0"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Muletas / vícios de linguagem — "né", "tipo", "aí"... com contagem e
              dica pra cortar. Vale pra texto E áudio (mostra sempre que o campo vier). */}
          {result.speechCrutches && result.speechCrutches.length > 0 && (
            <div className="bg-zinc-900/10 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-amber-400 mb-1 flex items-center">
                <Scissors className="w-5 h-5 mr-2" />
                Muletas de linguagem
              </h3>
              <p className="text-zinc-500 text-xs mb-4">Palavrinhas que escapam sem a gente perceber — cortá-las deixa sua fala muito mais firme. ✂️</p>
              <div className="space-y-3">
                {result.speechCrutches.map((item, idx) => (
                  <div key={idx} className="bg-black/20 rounded-lg p-3 border border-zinc-800/50">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-sm font-bold break-words">
                        "{item.term}"
                      </span>
                      {typeof item.count === 'number' && item.count > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-400/90 text-xs font-mono font-bold">
                          ×{item.count}
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">{item.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vocabulary Suggestions — texto E áudio: renderiza sempre que o campo existir. */}
          {result.vocabularySuggestions && result.vocabularySuggestions.length > 0 && (
            <div className="bg-zinc-900/10 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center">
                <Type className="w-5 h-5 mr-2" />
                Sugestões de Vocabulário
              </h3>
              <div className="space-y-4">
                {result.vocabularySuggestions.map((item, idx) => (
                  <div key={idx} className="bg-black/20 rounded-lg p-3 border border-zinc-800/50">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                      <span className="text-red-400 line-through text-sm break-words min-w-0">{item.original}</span>
                      <span className="text-zinc-600 text-xs">→</span>
                      <span className="text-lime-400 font-bold text-sm break-words min-w-0">{item.suggestion}</span>
                    </div>
                    <p className="text-zinc-500 text-xs italic">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phrasing / Grammar Fixes — reescritas gentis de frases mal colocadas.
              Texto E áudio: renderiza sempre que o campo existir. */}
          {result.phrasingFixes && result.phrasingFixes.length > 0 && (
            <div className="bg-zinc-900/10 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-1 flex items-center">
                <Wand2 className="w-5 h-5 mr-2 text-lime-400" />
                Deixe a frase ainda melhor
              </h3>
              <p className="text-zinc-500 text-xs mb-4">Pequenos ajustes de clareza e gramática — sem stress, é só polir. 🌱</p>
              <div className="space-y-4">
                {result.phrasingFixes.map((item, idx) => (
                  <div key={idx} className="bg-black/20 rounded-lg p-4 border border-zinc-800/50">
                    <p className="text-zinc-500 text-sm leading-relaxed mb-2">"{item.original}"</p>
                    <div className="flex items-start gap-2 mb-2">
                      <ArrowRight className="w-4 h-4 text-lime-400 mt-0.5 flex-shrink-0" />
                      <p className="text-lime-300 font-medium text-sm leading-relaxed">"{item.correction}"</p>
                    </div>
                    <p className="text-zinc-500 text-xs italic">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Analysis */}
          {result.sectionAnalysis && result.sectionAnalysis.length > 0 && (
            <div className="bg-zinc-900/10 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center">
                <Layout className="w-5 h-5 mr-2" />
                Análise por Seção
              </h3>
              <div className="space-y-4">
                {result.sectionAnalysis.map((item, idx) => (
                  <div key={idx} className="bg-black/20 rounded-lg p-4 border border-zinc-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold text-sm">{item.sectionName}</h4>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        item.score >= 80 ? 'bg-lime-400/15 text-lime-400' :
                        item.score >= 60 ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400'
                      }`}>
                        {item.score}/100
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">{item.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fecha o loop: o coach aponta o próximo passo em vez de zerar tudo. */}
      <NextStep
        result={result}
        canRetry={canRetry}
        onRetry={onRetry}
        onTrainWeak={onTrainWeak}
        onViewJourney={onViewJourney}
        onReset={onReset}
      />
    </div>
  );
};

export default ResultsView;