import React, { useState } from 'react';
import { ArrowLeft, Mic, Square, RefreshCw, Send, Sparkles, Volume2 } from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { convertToWav, blobToBase64 } from '../../utils/audioWav';

interface DictionPracticeProps {
  onBack: () => void;
  onAnalyze: (input: { audioBase64: string; mimeType: string; dictionTarget: string }) => void;
}

type Level = 'leve' | 'medio' | 'dificil';

interface DictionExercise {
  id: string;
  level: Level;
  sound: string; // o som/articulação que o exercício treina
  text: string;  // o texto-alvo a ler em voz alta
}

// Biblioteca embutida de exercícios de dicção em PT-BR — trava-línguas clássicos
// e frases de articulação, organizados por nível e pelo som treinado. Conteúdo
// aproveitado do guia de treino de dicção do app.
const EXERCISES: DictionExercise[] = [
  // --- Leve: aquecimento e sons simples ---
  { id: 'p1', level: 'leve', sound: 'Som P', text: 'O peito do pé de Pedro é preto.' },
  { id: 's1', level: 'leve', sound: 'Som S (assobio)', text: 'Sabia que o sabiá sabia assobiar? O sabiá sabia.' },
  { id: 'c1', level: 'leve', sound: 'Sons C e CH', text: 'Casa suja, chão sujo. Chão sujo, casa suja.' },
  { id: 'art1', level: 'leve', sound: 'Articulação', text: 'Fale devagar e articule cada palavra: o rei, a rainha e o pequeno príncipe.' },

  // --- Médio: trocas rápidas de som ---
  { id: 'r1', level: 'medio', sound: 'Som R', text: 'O rato roeu a roupa do rei de Roma.' },
  { id: 'tr1', level: 'medio', sound: 'Grupo TR', text: 'Três pratos de trigo para três tigres tristes.' },
  { id: 'pr1', level: 'medio', sound: 'Grupo PR', text: 'Pedro Pedreiro pregou um prego na parede preta.' },
  { id: 'br1', level: 'medio', sound: 'Grupo BR', text: 'Bagre branco, branco bagre. Branco bagre, bagre branco.' },
  { id: 'rr1', level: 'medio', sound: 'Som R vibrado', text: 'A aranha arranha a rã. A rã arranha a aranha.' },
  { id: 'lj1', level: 'medio', sound: 'Sons L e J', text: 'Larga a jarra, jarra larga. Jarra larga, larga a jarra.' },

  // --- Difícil: sequências longas e traiçoeiras ---
  { id: 't1', level: 'dificil', sound: 'Som T', text: 'O tempo perguntou ao tempo quanto tempo o tempo tem; o tempo respondeu ao tempo que o tempo tem tanto tempo quanto tempo o tempo tem.' },
  { id: 'p2', level: 'dificil', sound: 'Som P', text: 'Se o Papa papasse papa, se o Papa papasse pão, o Papa tudo papava e seria um Papa-papão.' },
  { id: 'r2', level: 'dificil', sound: 'Som R forte', text: 'O rato roeu a rolha da garrafa do rei da Rússia.' },
  { id: 'mf1', level: 'dificil', sound: 'Nasais MF', text: 'Um ninho de mafagafos tem cinco mafagafinhos; quem os desmafagafizar, bom desmafagafizador será.' },
];

const LEVELS: { key: Level; label: string; hint: string }[] = [
  { key: 'leve', label: 'Leve', hint: 'aquecimento' },
  { key: 'medio', label: 'Médio', hint: 'trocas rápidas' },
  { key: 'dificil', label: 'Difícil', hint: 'para desafiar a boca' },
];

// Cores por nível (mantendo a paleta zinc/lime do app).
const LEVEL_STYLE: Record<Level, string> = {
  leve: 'bg-lime-400/10 text-lime-400 border-lime-400/30',
  medio: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
  dificil: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
};

const DictionPractice: React.FC<DictionPracticeProps> = ({ onBack, onAnalyze }) => {
  const [selected, setSelected] = useState<DictionExercise | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const { isRecording, recordingDuration, audioBlob, errorMsg, startRecording, stopRecording, clearAudio } = useAudioRecorder();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnalyze = async () => {
    if (!selected || !audioBlob) return;
    try {
      setPrepError(null);
      setIsPreparing(true);
      // webm → wav (o Gemini não aceita webm), como no InputSection.
      const wav = await convertToWav(audioBlob);
      const base64 = await blobToBase64(wav);
      setIsPreparing(false);
      onAnalyze({ audioBase64: base64, mimeType: 'audio/wav', dictionTarget: selected.text });
    } catch (e) {
      console.error('Erro ao preparar áudio da dicção:', e);
      setIsPreparing(false);
      setPrepError('Erro ao processar o áudio. Tente gravar novamente.');
    }
  };

  const backToList = () => {
    clearAudio();
    setPrepError(null);
    setSelected(null);
  };

  // Passo 1 — escolher o exercício, agrupado por nível.
  if (!selected) {
    return (
      <div className="w-full max-w-4xl mx-auto animate-fadeInUp">
        <button
          onClick={onBack}
          className="flex items-center text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </button>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">Exercícios de Dicção</h2>
        <p className="text-zinc-400 mb-8 text-sm max-w-2xl">
          Dicção é músculo — e músculo a gente treina. Escolha um exercício, leia em voz alta
          (comece devagar e só acelere quando sair limpo) e grave pra receber onde a fala tropeçou.
        </p>

        <div className="space-y-8">
          {LEVELS.map(({ key, label, hint }) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${LEVEL_STYLE[key]}`}>{label}</span>
                <span className="text-xs text-zinc-600">{hint}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXERCISES.filter(e => e.level === key).map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => { clearAudio(); setSelected(ex); }}
                    className="group text-left bg-zinc-900 border border-zinc-800 hover:border-lime-400/50 rounded-xl p-4 transition-all hover:bg-zinc-800/60"
                  >
                    <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1 flex items-center gap-1.5">
                      <Volume2 className="w-3 h-3 text-lime-400" /> {ex.sound}
                    </p>
                    <p className="text-zinc-200 text-sm leading-relaxed group-hover:text-white transition-colors">{ex.text}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Passo 2 — ler o texto grande na tela e gravar.
  const readyToSend = !!audioBlob && !isRecording && !isPreparing;
  return (
    <div className="w-full max-w-3xl mx-auto animate-fadeInUp">
      <button
        onClick={backToList}
        className="flex items-center text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Outro exercício
      </button>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-lime-400 font-bold mb-6 flex items-center justify-center gap-1.5">
          <Volume2 className="w-4 h-4" /> {selected.sound}
        </p>

        {/* O texto-alvo, bem grande, pra ler em voz alta. */}
        <p className="text-2xl md:text-4xl font-bold text-white leading-snug mb-8 max-w-2xl mx-auto">
          "{selected.text}"
        </p>

        {/* Controles de gravação */}
        <div className="flex flex-col items-center gap-6">
          {isRecording ? (
            <>
              <div className="text-4xl md:text-5xl font-mono font-bold tabular-nums text-white">{formatTime(recordingDuration)}</div>
              <button
                onClick={stopRecording}
                className="group flex items-center justify-center w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 hover:scale-105 transition-all shadow-lg shadow-red-500/20 animate-pulse"
              >
                <Square className="w-8 h-8 text-white fill-current" />
              </button>
              <p className="text-zinc-400 text-sm">Lendo... articule cada sílaba.</p>
            </>
          ) : readyToSend ? (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto justify-center">
              <button
                onClick={() => clearAudio()}
                className="flex items-center justify-center px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-medium transition-colors border border-zinc-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regravar
              </button>
              <button
                onClick={handleAnalyze}
                className="flex items-center justify-center px-6 py-3 bg-lime-400 hover:bg-lime-300 text-black rounded-full font-bold transition-colors shadow-lg shadow-lime-400/20"
              >
                <Send className="w-4 h-4 mr-2" />
                Analisar dicção
              </button>
            </div>
          ) : isPreparing ? (
            <p className="text-blue-400 text-sm flex items-center">
              <Sparkles className="w-4 h-4 mr-2 animate-spin" /> Preparando áudio...
            </p>
          ) : (
            <>
              <button
                onClick={startRecording}
                className="group flex items-center justify-center w-20 h-20 rounded-full bg-lime-400 hover:bg-lime-300 hover:scale-105 transition-all shadow-lg shadow-lime-400/20"
              >
                <Mic className="w-8 h-8 text-black group-hover:scale-110 transition-transform" />
              </button>
              <p className="text-zinc-400 text-sm">Toque no microfone e leia em voz alta.</p>
            </>
          )}

          {(errorMsg || prepError) && (
            <p className="text-red-400 text-sm">{errorMsg || prepError}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DictionPractice;
