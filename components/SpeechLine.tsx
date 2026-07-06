import React from 'react';
import { SPEECH_PARTS } from '../constants/speechParts';

// "A linha de um bom discurso": explica, discreto e elegante, as 5 partes que o
// app avalia. Fica fixa na home pra quem chega saber o que é medido. As partes
// vêm de SPEECH_PARTS (fonte de verdade única).
const SpeechLine: React.FC = () => {
  return (
    <section className="max-w-4xl mx-auto mt-16 animate-fadeIn">
      <div className="text-center mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">A linha de um bom discurso</h3>
        <p className="mt-2 text-sm text-zinc-500">As 5 partes que o Demóstenes escuta em cada fala.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SPEECH_PARTS.map(({ key, label, shortDesc }, idx) => (
          <div
            key={key}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-mono font-bold text-lime-400">{String(idx + 1).padStart(2, '0')}</span>
              <h4 className="text-white font-bold">{label}</h4>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">{shortDesc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SpeechLine;
