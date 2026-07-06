import React, { useState } from 'react';
import { Send, ArrowLeft, Handshake, Sparkles, Compass, Layers, Flag } from 'lucide-react';
import { SpeechPart } from '../../types';

interface SectionPracticeProps {
  onBack: () => void;
  onAnalyze: (input: { text: string; sectionPart: SpeechPart }) => void;
}

// As 5 PARTES do discurso, cada uma com o que precisa ALCANÇAR (1 frase) e o
// placeholder que ajuda a pessoa a colar o trecho certo. Mesma linha de
// raciocínio da análise completa — aqui a pessoa treina uma parte de cada vez.
const PARTS: {
  part: SpeechPart;
  label: string;
  goal: string;
  placeholder: string;
  icon: React.ReactNode;
}[] = [
  {
    part: 'cumprimento',
    label: 'Cumprimento',
    goal: 'Saudar e se apresentar, estabelecendo contato com a plateia.',
    placeholder: 'Ex.: "Boa noite a todos, eu sou a Marina e é uma alegria estar aqui..."',
    icon: <Handshake className="w-6 h-6" />,
  },
  {
    part: 'conquista',
    label: 'Conquista',
    goal: 'Conquistar a atenção e a simpatia logo de cara: história, pergunta, dado surpreendente ou elogio sincero.',
    placeholder: 'Ex.: "Vocês sabiam que passamos 1/3 da vida no trabalho? Foi isso que me fez repensar tudo..."',
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    part: 'preparacao',
    label: 'Preparação',
    goal: 'Preparar o terreno: contextualizar, anunciar o tema e criar expectativa para o assunto central.',
    placeholder: 'Ex.: "Hoje eu quero falar sobre três hábitos que mudaram a forma como eu lido com o tempo..."',
    icon: <Compass className="w-6 h-6" />,
  },
  {
    part: 'desenvolvimento',
    label: 'Desenvolvimento',
    goal: 'Sustentar o assunto central com argumentos, exemplos e provas, em sequência lógica.',
    placeholder: 'Ex.: "O primeiro hábito é... e eu digo isso porque uma vez..."',
    icon: <Layers className="w-6 h-6" />,
  },
  {
    part: 'conclusao',
    label: 'Conclusão',
    goal: 'Fechar forte: síntese, apelo à ação ou frase de impacto — nunca terminar seco.',
    placeholder: 'Ex.: "Então, se você levar uma coisa daqui hoje, que seja esta: comece pequeno, mas comece hoje."',
    icon: <Flag className="w-6 h-6" />,
  },
];

const SectionPractice: React.FC<SectionPracticeProps> = ({ onBack, onAnalyze }) => {
  const [selected, setSelected] = useState<SpeechPart | null>(null);
  const [text, setText] = useState('');

  const chosen = PARTS.find(p => p.part === selected) ?? null;

  const handleAnalyze = () => {
    if (chosen && text.trim()) {
      onAnalyze({ text, sectionPart: chosen.part });
    }
  };

  // Passo 1 — escolher qual das 5 partes treinar.
  if (!chosen) {
    return (
      <div className="w-full max-w-4xl mx-auto animate-fadeInUp">
        <button
          onClick={onBack}
          className="flex items-center text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </button>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Prática de Seção</h2>
        <p className="text-zinc-400 mb-8 text-sm max-w-2xl">
          Um bom discurso segue uma linha de raciocínio em 5 partes. Escolha a que você quer treinar,
          cole aquele trecho e receba um feedback focado só nela.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PARTS.map(({ part, label, goal, icon }, idx) => (
            <button
              key={part}
              onClick={() => setSelected(part)}
              className="group text-left bg-zinc-900 border border-zinc-800 hover:border-lime-400/50 rounded-2xl p-5 md:p-6 transition-all hover:bg-zinc-800/60 flex items-start gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-zinc-800 group-hover:bg-lime-400/10 flex items-center justify-center flex-shrink-0 text-zinc-400 group-hover:text-lime-400 transition-colors">
                {icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-zinc-600">{idx + 1}</span>
                  <h3 className="text-lg font-bold text-white">{label}</h3>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed">{goal}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Passo 2 — colar o trecho daquela parte e enviar.
  return (
    <div className="w-full max-w-4xl mx-auto animate-fadeInUp">
      <button
        onClick={() => { setSelected(null); setText(''); }}
        className="flex items-center text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Escolher outra parte
      </button>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-lime-400/10 flex items-center justify-center text-lime-400 flex-shrink-0">
            {chosen.icon}
          </div>
          <h2 className="text-2xl font-bold text-white">{chosen.label}</h2>
        </div>
        <p className="text-zinc-400 mb-6 text-sm">
          {chosen.goal} Cole abaixo esse trecho do seu discurso e vamos ver se ele cumpre esse papel.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-56 bg-zinc-950 border border-zinc-800 rounded-xl p-4 sm:p-6 text-white text-base sm:text-lg leading-relaxed focus:outline-none focus:border-lime-400/40 resize-none placeholder-zinc-600 font-light mb-6"
          placeholder={chosen.placeholder}
        />

        <div className="flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={!text.trim()}
            className={`flex w-full sm:w-auto items-center justify-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all ${
              !text.trim()
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-lime-400 text-black hover:bg-lime-300 shadow-lg shadow-lime-400/20 hover:scale-105'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Analisar {chosen.label}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SectionPractice;
