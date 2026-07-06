import React from 'react';
import { Target } from 'lucide-react';

interface MissionBannerProps {
  mission: string;
  // compacto = versão enxuta que fica DENTRO de um modo de prática (lembrete do
  // que a pessoa veio treinar); sem ele = banner completo do seletor.
  compact?: boolean;
}

// Banner da MISSÃO que veio junto do "Treinar o foco". Deixa óbvio que a pessoa
// entrou na prática pra cumprir uma missão concreta. Paleta lime-400/10 com ring,
// consistente com o bilhete do coach.
const MissionBanner: React.FC<MissionBannerProps> = ({ mission, compact }) => {
  if (compact) {
    return (
      <div className="mb-6 flex items-start gap-2.5 bg-lime-400/10 ring-1 ring-lime-400/30 rounded-xl px-4 py-2.5 text-left">
        <Target className="w-4 h-4 text-lime-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-zinc-100 leading-snug">
          <span className="font-semibold text-lime-400/90">Sua missão:</span> {mission}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 flex items-start gap-3 bg-lime-400/10 ring-1 ring-lime-400/30 rounded-2xl px-5 py-4 text-left">
      <div className="w-10 h-10 rounded-full bg-lime-400/10 flex items-center justify-center ring-1 ring-lime-400/30 flex-shrink-0">
        <Target className="w-5 h-5 text-lime-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest text-lime-400/80 font-bold mb-1">Sua missão</p>
        <p className="text-zinc-100 leading-relaxed">{mission}</p>
      </div>
    </div>
  );
};

export default MissionBanner;
