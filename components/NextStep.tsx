import React from 'react';
import { AnalysisResult, MetricKey } from '../types';
import { RotateCcw, Target, TrendingUp, Sparkles, Flag, ArrowRight, PenLine } from 'lucide-react';

interface NextStepProps {
  result: AnalysisResult;
  canRetry: boolean;          // só dá pra "refazer" quando havia texto (áudio não pré-preenche).
  onRetry: () => void;
  onTrainWeak: () => void;
  onViewJourney: () => void;
  onReset: () => void;
}

// Rótulos PT-BR das métricas, pra mostrar o foco de forma humana.
const FOCUS_LABELS: Record<MetricKey, string> = {
  clarity: 'Clareza',
  persuasion: 'Persuasão',
  structure: 'Estrutura',
  vocabulary: 'Vocabulário',
  tone: 'Tom',
};

// Bloco final do resultado: em vez de um botão seco que zera tudo, o coach
// entrega um bilhete, aponta o foco e oferece o próximo passo concreto.
const NextStep: React.FC<NextStepProps> = ({ result, canRetry, onRetry, onTrainWeak, onViewJourney, onReset }) => {
  const focusLabel = result.focusArea ? FOCUS_LABELS[result.focusArea] : null;

  return (
    <div className="mt-12 max-w-4xl mx-auto animate-fadeInUp">
      <div className="bg-gradient-to-b from-lime-400/[0.07] to-transparent border border-lime-400/20 rounded-3xl p-5 md:p-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-lime-500/[0.08] rounded-full blur-[100px] pointer-events-none"></div>

        {/* Bilhete do coach — a memória-semente, com energia de quem acredita em você. */}
        {result.coachNote && (
          <div className="flex items-start gap-3 mb-6 relative">
            <div className="w-10 h-10 rounded-full bg-lime-400/10 flex items-center justify-center ring-1 ring-lime-400/30 flex-shrink-0">
              <Sparkles className="w-5 h-5 text-lime-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-lime-400/70 font-bold mb-1">Bilhete do Demóstenes</p>
              <p className="text-zinc-100 text-lg leading-relaxed font-light">"{result.coachNote}"</p>
            </div>
          </div>
        )}

        {/* Comparação com a última vez (aparece a partir da Fase 2, quando há contexto). */}
        {result.progressComment && (
          <div className="mb-6 flex items-center gap-2 bg-lime-400/10 border border-lime-400/20 rounded-xl px-4 py-3 text-lime-300">
            <TrendingUp className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{result.progressComment}</p>
          </div>
        )}

        {/* Próximo passo + foco. */}
        {(result.nextStep || focusLabel) && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-stretch">
            {result.nextStep && (
              <div className="bg-black/30 border border-zinc-800 rounded-2xl p-5">
                <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2 flex items-center">
                  <ArrowRight className="w-3.5 h-3.5 mr-1.5 text-lime-400" /> Próximo passo
                </p>
                <p className="text-zinc-200 leading-relaxed">{result.nextStep}</p>
              </div>
            )}
            {focusLabel && (
              <div className="bg-black/30 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-center sm:min-w-[9rem]">
                <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2 flex items-center">
                  <Target className="w-3.5 h-3.5 mr-1.5 text-lime-400" /> Foco
                </p>
                <p className="text-lime-400 text-xl font-bold">{focusLabel}</p>
              </div>
            )}
          </div>
        )}

        {/* Missão sugerida. */}
        {result.suggestedMission && (
          <div className="mb-8 flex items-start gap-3 bg-black/20 border border-dashed border-zinc-700 rounded-2xl p-5">
            <Flag className="w-5 h-5 text-lime-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Sua missão pra próxima</p>
              <p className="text-zinc-200 leading-relaxed">{result.suggestedMission}</p>
            </div>
          </div>
        )}

        {/* Os CTAs — sempre há um convite pra próxima rep. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={onRetry}
            disabled={!canRetry}
            title={canRetry ? 'Refazer aplicando as sugestões' : 'Disponível para discursos em texto'}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${
              canRetry
                ? 'bg-lime-400 hover:bg-lime-300 text-black hover:scale-[1.02] shadow-lg shadow-lime-400/20'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-5 h-5" />
            <span>Refazer e melhorar</span>
          </button>

          <button
            onClick={onTrainWeak}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-lime-400/40 text-zinc-200 transition-all"
          >
            <Target className="w-5 h-5 text-lime-400" />
            <span>Treinar o foco</span>
          </button>

          <button
            onClick={onViewJourney}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-lime-400/40 text-zinc-200 transition-all"
          >
            <TrendingUp className="w-5 h-5 text-lime-400" />
            <span>Ver evolução</span>
          </button>
        </div>

        {/* Escape discreto pra começar do zero. */}
        <div className="mt-6 text-center">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <PenLine className="w-4 h-4" /> ou analisar um discurso novo
          </button>
        </div>
      </div>
    </div>
  );
};

export default NextStep;
