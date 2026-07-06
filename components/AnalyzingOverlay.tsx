import React, { useState, useEffect } from 'react';
import { Sparkles, Mic, FileText, BarChart3, CheckCircle2 } from 'lucide-react';

interface AnalyzingOverlayProps {
  hasAudio: boolean;
  isProfessorMode?: boolean;
}

// 4 estágios visuais que o usuário acompanha enquanto o Gemini trabalha.
// Não reflete tempos exatos — só dá sensação de progresso real e comunicativo.
const STAGES = [
  {
    id: 'upload',
    label: 'Enviando áudio para o servidor...',
    icon: Mic,
    minMs: 400,
  },
  {
    id: 'transcribe',
    label: 'Transcrevendo o discurso...',
    icon: FileText,
    minMs: 1500,
  },
  {
    id: 'analyze',
    label: 'Analisando estrutura retórica, ritmo e tom...',
    icon: BarChart3,
    minMs: 2500,
  },
  {
    id: 'finalize',
    label: 'Montando seu feedback personalizado...',
    icon: Sparkles,
    minMs: 800,
  },
] as const;

const AnalyzingOverlay: React.FC<AnalyzingOverlayProps> = ({ hasAudio, isProfessorMode }) => {
  // Começa em "upload" se tem áudio, senão pula direto pra "transcribe".
  const [stageIdx, setStageIdx] = useState<number>(hasAudio ? 0 : 1);

  useEffect(() => {
    let cancelled = false;
    let timeouts: number[] = [];

    const advance = (idx: number) => {
      if (cancelled) return;
      if (idx >= STAGES.length) return;
      setStageIdx(idx);
      const next = STAGES[idx];
      // Avança pro próximo estágio depois de minMs (mas continua girando o spinner se a promise não resolveu)
      timeouts.push(window.setTimeout(() => advance(idx + 1), next.minMs));
    };

    advance(hasAudio ? 0 : 1);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [hasAudio]);

  const current = STAGES[Math.min(stageIdx, STAGES.length - 1)];
  const Icon = current.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fadeIn"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="analyzing-overlay"
    >
      <div className="max-w-md w-full mx-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
        {/* Spinner grande */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-lime-400 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="w-7 h-7 text-lime-400" />
          </div>
        </div>

        {/* Mensagem do estágio atual */}
        <h3 className="text-xl font-semibold text-white mb-2">{current.label}</h3>
        <p className="text-zinc-500 text-sm font-mono mb-6">
          Isso leva de 5 a 15 segundos — pode levar mais se o áudio for longo.
        </p>

        {/* Linha de estágios (chips) */}
        <ol className="flex flex-wrap items-center justify-center gap-1 mb-4">
          {STAGES.map((s, i) => {
            const isDone = i < stageIdx;
            const isCurrent = i === stageIdx;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider ${
                  isDone
                    ? 'bg-lime-400/20 text-lime-400'
                    : isCurrent
                      ? 'bg-white/10 text-white'
                      : 'bg-zinc-800/50 text-zinc-600'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : isCurrent ? (
                  <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-zinc-700" />
                )}
                <span>{s.id}</span>
              </li>
            );
          })}
        </ol>

        {/* Badge de modo professor (sem expor o modelo de IA). */}
        {isProfessorMode && (
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="text-blue-400">modo professor</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyzingOverlay;
