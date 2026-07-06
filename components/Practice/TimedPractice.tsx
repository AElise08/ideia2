import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, RefreshCw, ArrowLeft, Send, Sparkles } from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { convertToWav, blobToBase64 } from '../../utils/audioWav';
import MissionBanner from './MissionBanner';

interface TimedPracticeProps {
  onBack: () => void;
  onAnalyze: (input: { audioBase64: string; mimeType: string }) => void;
  mission?: string; // missão que veio do "Treinar o foco" (opcional).
}

const TOPICS = [
  "O futuro da inteligência artificial",
  "A importância da educação financeira",
  "Como lidar com o fracasso",
  "O impacto das redes sociais na sociedade",
  "Sustentabilidade no dia a dia",
  "A arte de contar histórias",
  "Liderança em tempos de crise",
  "Minimalismo como estilo de vida",
  "O papel da arte na sociedade moderna",
  "A importância do equilíbrio entre vida pessoal e profissional",
  "Como a tecnologia está mudando o mercado de trabalho",
  "O valor da empatia nas relações humanas",
  "Desafios da educação no século XXI",
  "A influência da cultura pop na juventude",
  "Os benefícios da meditação e mindfulness",
  "A importância de aprender novos idiomas",
  "O impacto das mudanças climáticas",
  "Como construir hábitos saudáveis",
  "A evolução da comunicação digital",
  "O poder do pensamento positivo",
  "A importância da diversidade no ambiente de trabalho",
  "Como a inteligência emocional afeta o sucesso",
  "O futuro das viagens espaciais",
  "A ética na manipulação genética",
  "O impacto do trabalho remoto na produtividade"
];

const TimedPractice: React.FC<TimedPracticeProps> = ({ onBack, onAnalyze, mission }) => {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds default
  const [duration, setDuration] = useState(60);
  const [isFinished, setIsFinished] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const { isRecording, startRecording, stopRecording, audioBlob, clearAudio } = useAudioRecorder();

  useEffect(() => {
    setTopic(TOPICS[Math.floor(Math.random() * TOPICS.length)]);
  }, []);

  useEffect(() => {
    if (isRecording && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRecording) {
      handleStop();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, timeLeft]);

  const handleStart = async () => {
    await startRecording();
    setIsFinished(false);
    setTimeLeft(duration);
  };

  const handleStop = () => {
    stopRecording();
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleReset = () => {
    clearAudio();
    setIsFinished(false);
    setTimeLeft(duration);
    setTopic(TOPICS[Math.floor(Math.random() * TOPICS.length)]);
  };

  const handleAnalyze = async () => {
    if (audioBlob) {
      setIsAnalyzing(true);
      try {
        // webm → wav (o Gemini não aceita webm), como no InputSection/DictionPractice.
        const wav = await convertToWav(audioBlob);
        const base64 = await blobToBase64(wav);
        onAnalyze({
          audioBase64: base64,
          mimeType: 'audio/wav'
        });
      } catch (e) {
        console.error("Error analyzing audio", e);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fadeInUp">
      <button 
        onClick={onBack}
        className="flex items-center text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </button>

      {/* Lembrete da missão — fica visível o tempo todo, inclusive gravando. */}
      {mission && <MissionBanner mission={mission} compact />}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-8 text-center">
        <h3 className="text-zinc-500 text-sm uppercase tracking-widest font-bold mb-4">Tópico Sugerido</h3>
        <p className="text-2xl md:text-3xl font-bold text-white mb-8 leading-tight">
          "{topic}"
        </p>
        
        <div className="flex justify-center space-x-4 mb-8">
          <button 
            onClick={() => setTopic(TOPICS[Math.floor(Math.random() * TOPICS.length)])}
            className="text-xs text-zinc-400 hover:text-white flex items-center bg-zinc-800 px-4 py-2 sm:px-3 sm:py-1 rounded-full transition-colors"
            disabled={isRecording}
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Novo Tópico
          </button>
        </div>

        <div className="mb-8">
          <div className={`text-5xl md:text-6xl font-mono font-bold tabular-nums tracking-tighter transition-colors ${timeLeft <= 10 && isRecording ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {formatTime(timeLeft)}
          </div>
          <div className="flex justify-center mt-4 space-x-2">
            {[30, 60, 120].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setDuration(t);
                  setTimeLeft(t);
                }}
                disabled={isRecording || isFinished}
                className={`px-4 py-2 sm:px-3 sm:py-1 rounded text-xs font-medium transition-colors ${
                  duration === t
                    ? 'bg-lime-400 text-black'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {t / 60} min
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center space-y-6">
          <div className="flex justify-center items-center space-x-6">
            {!isRecording && !isFinished && (
              <button
                onClick={handleStart}
                className="group flex items-center justify-center w-20 h-20 rounded-full bg-lime-400 hover:bg-lime-300 hover:scale-105 transition-all shadow-lg shadow-lime-400/20"
              >
                <Mic className="w-8 h-8 text-black group-hover:scale-110 transition-transform" />
              </button>
            )}

            {isRecording && (
              <button
                onClick={handleStop}
                className="group flex items-center justify-center w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 hover:scale-105 transition-all shadow-lg shadow-red-500/20 animate-pulse"
              >
                <Square className="w-8 h-8 text-white fill-current" />
              </button>
            )}

            {isFinished && (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-medium transition-colors border border-zinc-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </button>

                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex items-center justify-center px-6 py-3 bg-lime-400 hover:bg-lime-300 text-black rounded-full font-bold transition-colors shadow-lg shadow-lime-400/20"
                >
                  {isAnalyzing ? <Sparkles className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  {isAnalyzing ? 'Analisando...' : 'Analisar Discurso'}
                </button>
              </div>
            )}
          </div>
          
          {isFinished && (
             <p className="text-zinc-400 text-sm max-w-md mx-auto">
               Bom trabalho! Agora analise seu discurso para receber feedback sobre clareza, ritmo e persuasão.
             </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimedPractice;
