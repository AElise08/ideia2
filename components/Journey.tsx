import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft, TrendingUp, Flame, Trophy, Mic, ArrowUpRight, ArrowDownRight,
  Minus, Sparkles, Clock, Trash2, ChevronRight, Volume2,
} from 'lucide-react';
import { HistoryItem, MetricKey } from '../types';

interface JourneyProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onBack: () => void;
}

// Rótulos PT-BR das métricas (mesma ordem usada no app).
const METRIC_LABELS: Record<MetricKey, string> = {
  clarity: 'Clareza',
  persuasion: 'Persuasão',
  structure: 'Estrutura',
  vocabulary: 'Vocabulário',
  tone: 'Tom',
};
const METRIC_KEYS: MetricKey[] = ['clarity', 'persuasion', 'structure', 'vocabulary', 'tone'];

// --- Helpers (todos com guardas: histórico antigo pode não ter overallScore/metrics). ---

// Chave de dia local (YYYY-MM-DD) a partir de um timestamp.
const dayKey = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

// Streak = dias de treino consecutivos terminando no treino mais recente.
// Tolerância: conta dias-calendário; hoje/ontem ainda contam como "vivo".
const computeStreak = (items: HistoryItem[]): number => {
  if (items.length === 0) return 0;
  const days = Array.from(new Set(items.map(i => dayKey(i.timestamp))))
    .map(k => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m, d).getTime();
    })
    .sort((a, b) => b - a); // mais recente primeiro
  const DAY = 86400000;
  let streak = 1;
  for (let idx = 1; idx < days.length; idx++) {
    const gap = Math.round((days[idx - 1] - days[idx]) / DAY);
    if (gap === 1) streak++;
    else break;
  }
  return streak;
};

// Mini sparkline em SVG puro (leve; evita 5 instâncias de recharts).
const Sparkline: React.FC<{ values: number[]; up: boolean }> = ({ values, up }) => {
  const w = 88;
  const h = 28;
  if (values.length < 2) {
    return <div className="h-7 flex items-center text-zinc-700 text-xs">—</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(1)}`)
    .join(' ');
  const color = up ? '#a3e635' : '#71717a';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={(w).toFixed(1)}
        cy={(h - ((values[values.length - 1] - min) / range) * (h - 4) - 2).toFixed(1)}
        r={2.5}
        fill={color}
      />
    </svg>
  );
};

const Journey: React.FC<JourneyProps> = ({ history, onSelect, onDelete, onClear, onBack }) => {
  // Ordena por tempo (crescente) uma única vez — base de tudo.
  const ordered = useMemo(
    () => [...history].sort((a, b) => a.timestamp - b.timestamp),
    [history],
  );

  // Só DISCURSOS entram na régua de notas/tendências — os treinos de dicção
  // ficam de fora (senão poluem a curva, que mede discurso). A dicção entra no
  // streak (é treino) e ganha um card próprio de marcos.
  const speeches = useMemo(
    () => ordered.filter(i => i.mode !== 'diction'),
    [ordered],
  );
  const dictionCount = useMemo(
    () => ordered.filter(i => i.mode === 'diction').length,
    [ordered],
  );

  // Itens com nota válida, pra curva e marcos (só discursos).
  const scored = useMemo(
    () => speeches.filter(i => typeof i.result?.overallScore === 'number'),
    [speeches],
  );

  // Dados da curva de evolução.
  const curveData = useMemo(
    () => scored.map((i, idx) => ({
      idx: idx + 1,
      score: i.result.overallScore,
      label: new Date(i.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    })),
    [scored],
  );

  // Tendência por métrica: série + delta (primeiro → último). Só discursos.
  const metricTrends = useMemo(() => {
    return METRIC_KEYS.map(key => {
      const values = speeches
        .map(i => i.result?.metrics?.[key])
        .filter((v): v is number => typeof v === 'number');
      const first = values[0];
      const last = values[values.length - 1];
      const delta = values.length >= 2 ? Math.round(last - first) : 0;
      return { key, label: METRIC_LABELS[key], values, last, delta, count: values.length };
    });
  }, [speeches]);

  // Marcos. O streak conta TODO treino (inclusive dicção); "discursos" conta só
  // os discursos de fato.
  const streak = useMemo(() => computeStreak(ordered), [ordered]);
  const total = speeches.length;
  const bestScore = useMemo(
    () => (scored.length ? Math.max(...scored.map(i => i.result.overallScore)) : null),
    [scored],
  );

  // Antes/depois: cada refação (retryOf) emparelhada com o discurso original.
  const beforeAfter = useMemo(() => {
    const byId = new Map<string, HistoryItem>(ordered.map(i => [i.id, i] as const));
    const pairs: { before: HistoryItem; after: HistoryItem; gain: number }[] = [];
    for (const item of ordered) {
      if (!item.retryOf) continue;
      const before = byId.get(item.retryOf);
      if (!before) continue;
      const bs = before.result?.overallScore;
      const as = item.result?.overallScore;
      if (typeof bs !== 'number' || typeof as !== 'number') continue;
      pairs.push({ before, after: item, gain: Math.round(as - bs) });
    }
    return pairs.reverse(); // mais recentes primeiro
  }, [ordered]);

  const [confirmClear, setConfirmClear] = useState(false);

  // --- Estado vazio ---
  if (history.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center animate-fadeInUp relative z-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-lime-400 transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-lime-400/10 ring-1 ring-lime-400/30 flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-lime-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Sua jornada começa aqui</h2>
        <p className="text-zinc-400 text-lg font-light max-w-md mx-auto">
          Faça seu primeiro discurso pra começar a jornada. Cada análise vira um ponto na sua curva de evolução.
        </p>
      </div>
    );
  }

  const scoreColor = (s: number) => (s >= 80 ? 'text-lime-400' : s >= 60 ? 'text-zinc-200' : 'text-zinc-400');

  return (
    <div className="max-w-5xl mx-auto animate-fadeInUp relative z-10 pb-16">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-lime-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-lime-400 font-bold">Sua jornada</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Evolução</h2>
        </div>
      </div>

      {/* Marcos */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white leading-none">{streak}</p>
            <p className="text-xs text-zinc-500 mt-1">{streak === 1 ? 'dia de treino' : 'dias seguidos'}</p>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-400/10 flex items-center justify-center flex-shrink-0">
            <Mic className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white leading-none">{total}</p>
            <p className="text-xs text-zinc-500 mt-1">{total === 1 ? 'discurso' : 'discursos'}</p>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white leading-none">{bestScore ?? '—'}</p>
            <p className="text-xs text-zinc-500 mt-1">melhor nota</p>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-400/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white leading-none">
              {scored.length ? scored[scored.length - 1].result.overallScore : '—'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">nota atual</p>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0">
            <Volume2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white leading-none">{dictionCount}</p>
            <p className="text-xs text-zinc-500 mt-1">{dictionCount === 1 ? 'treino de dicção' : 'treinos de dicção'}</p>
          </div>
        </div>
      </div>

      {/* Curva de evolução */}
      <div className="bg-gradient-to-b from-lime-400/[0.05] to-transparent border border-zinc-800 rounded-3xl p-5 md:p-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5 text-lime-400" />
          <h3 className="text-lg font-semibold text-white">Curva de evolução</h3>
        </div>
        {curveData.length >= 2 ? (
          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#3f6212', borderRadius: 12, color: '#f4f4f5' }}
                  itemStyle={{ color: '#a3e635' }}
                  labelStyle={{ color: '#a1a1aa' }}
                  formatter={(v: number) => [`${v}/100`, 'Nota']}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#a3e635"
                  strokeWidth={2.5}
                  dot={{ fill: '#a3e635', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#a3e635' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-zinc-500 text-sm py-10 text-center">
            Faça mais um discurso pra ver sua curva de evolução ganhar forma.
          </p>
        )}
      </div>

      {/* Tendência por métrica */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-white">Tendência por métrica</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {metricTrends.map(({ key, label, values, last, delta, count }) => {
            const up = delta > 0;
            const flat = delta === 0;
            return (
              <div key={key} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{label}</p>
                    <p className="text-2xl font-bold text-white leading-none mt-1">
                      {typeof last === 'number' ? last : '—'}
                    </p>
                  </div>
                  {count >= 2 && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg ${
                        up ? 'bg-lime-400/10 text-lime-400' : flat ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : flat ? <Minus className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between mt-3">
                  <Sparkline values={values} up={up || flat} />
                  {count >= 2 && (
                    <span className="text-[11px] text-zinc-600">últimas {count}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Antes / depois */}
      {beforeAfter.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-white">Antes e depois</h3>
            <span className="text-xs text-zinc-500">refações que fecharam o loop</span>
          </div>
          <div className="space-y-3">
            {beforeAfter.map(({ before, after, gain }) => (
              <div
                key={after.id}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3"
              >
                <button
                  onClick={() => onSelect(before)}
                  className="text-left group min-w-0"
                >
                  <p className="text-[11px] uppercase tracking-widest text-zinc-600 font-bold mb-1">Antes</p>
                  <p className={`text-2xl font-bold ${scoreColor(before.result.overallScore)}`}>{before.result.overallScore}</p>
                  <p className="text-xs text-zinc-500 truncate group-hover:text-zinc-300 transition-colors mt-0.5">
                    {before.preview || 'Análise de áudio'}
                  </p>
                </button>
                <div className="flex flex-col items-center px-1">
                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                  <span className={`text-xs font-bold mt-1 ${gain > 0 ? 'text-lime-400' : gain < 0 ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {gain > 0 ? `+${gain}` : gain}
                  </span>
                </div>
                <button
                  onClick={() => onSelect(after)}
                  className="text-left group min-w-0"
                >
                  <p className="text-[11px] uppercase tracking-widest text-lime-400/70 font-bold mb-1">Depois</p>
                  <p className={`text-2xl font-bold ${scoreColor(after.result.overallScore)}`}>{after.result.overallScore}</p>
                  <p className="text-xs text-zinc-500 truncate group-hover:text-zinc-300 transition-colors mt-0.5">
                    {after.preview || 'Análise de áudio'}
                  </p>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linha do tempo — reusa os handlers do App (mesma lógica do Histórico). */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-400" />
            <h3 className="text-lg font-semibold text-white">Linha do tempo</h3>
          </div>
          {ordered.length > 0 && (
            confirmClear ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">Limpar tudo?</span>
                <button
                  onClick={() => { onClear(); setConfirmClear(false); }}
                  className="text-red-400 hover:text-red-300 font-semibold"
                >
                  Sim
                </button>
                <button onClick={() => setConfirmClear(false)} className="text-zinc-500 hover:text-zinc-300">
                  Não
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar
              </button>
            )
          )}
        </div>
        <div className="space-y-2">
          {[...ordered].reverse().map(item => {
            const score = item.result?.overallScore;
            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                className="group flex items-center gap-3 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3 cursor-pointer transition-all"
              >
                <div className="flex-shrink-0 w-12 text-center">
                  <span className={`text-lg font-bold ${typeof score === 'number' ? scoreColor(score) : 'text-zinc-600'}`}>
                    {typeof score === 'number' ? score : '—'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-300 font-medium truncate">
                    {item.preview || 'Análise de áudio'}
                    {item.retryOf && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-lime-400/80 font-bold">refação</span>
                    )}
                    {item.mode === 'diction' && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400/80 font-bold">dicção</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-600 font-mono mt-0.5">
                    {new Date(item.timestamp).toLocaleDateString('pt-BR')} • {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 md:p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Journey;
