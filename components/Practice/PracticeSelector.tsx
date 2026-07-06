import React from 'react';
import { Clock, BookOpen, Volume2 } from 'lucide-react';
import { PracticeMode } from '../../types';

interface PracticeSelectorProps {
  onSelectMode: (mode: PracticeMode) => void;
}

// Os três modos de prática. Cada card leva pro fluxo correspondente.
const MODES: {
  mode: PracticeMode;
  title: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    mode: PracticeMode.TIMED,
    title: 'Desafio Cronometrado',
    desc: 'Melhore sua fluência e o controle de tempo. Fale sobre um tópico aleatório por um tempo determinado.',
    icon: <Clock className="w-8 h-8" />,
  },
  {
    mode: PracticeMode.SECTION,
    title: 'Prática de Seção',
    desc: 'Treine uma das 5 partes do discurso de cada vez. Cole o trecho e receba um feedback focado só nela.',
    icon: <BookOpen className="w-8 h-8" />,
  },
  {
    mode: PracticeMode.DICTION,
    title: 'Exercícios de Dicção',
    desc: 'Trava-línguas e frases de articulação por nível. Leia em voz alta, grave e veja onde a fala tropeçou.',
    icon: <Volume2 className="w-8 h-8" />,
  },
];

const PracticeSelector: React.FC<PracticeSelectorProps> = ({ onSelectMode }) => {
  return (
    <div className="w-full max-w-5xl mx-auto animate-fadeInUp">
      <h2 className="text-3xl font-bold text-white mb-8 text-center tracking-tight">Modo de Prática</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MODES.map(({ mode, title, desc, icon }) => (
          <button
            key={mode}
            onClick={() => onSelectMode(mode)}
            className="group relative bg-zinc-900 border border-zinc-800 hover:border-lime-400/50 rounded-2xl p-6 md:p-8 transition-all hover:bg-zinc-800 flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 rounded-full bg-zinc-800 group-hover:bg-lime-400/10 flex items-center justify-center mb-6 transition-colors text-zinc-400 group-hover:text-lime-400">
              {icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PracticeSelector;
