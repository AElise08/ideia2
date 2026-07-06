import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Sparkles, AlertTriangle, Trash2, Flag, GraduationCap, RotateCcw, X } from 'lucide-react';
import { SectionMarker, SpeechPart } from '../types';
import { SPEECH_PARTS } from '../constants/speechParts';
import { convertToWav, blobToBase64 } from '../utils/audioWav';

// Cor de cada marcador das 5 partes. Os rótulos vêm de SPEECH_PARTS (fonte de
// verdade única) — aqui fica só a cor de cada etapa na hora de marcar ao vivo.
const MARKER_COLORS: Record<SpeechPart, string> = {
  cumprimento: 'text-sky-400',
  conquista: 'text-lime-400',
  preparacao: 'text-amber-400',
  desenvolvimento: 'text-green-400',
  conclusao: 'text-purple-400',
};

interface InputSectionProps {
  onAnalyze: (input: { text?: string; audioBase64?: string; mimeType?: string; markers?: SectionMarker[]; isProfessorMode?: boolean }) => void;
  isAnalyzing: boolean;
  initialText?: string;       // texto pré-preenchido ao "refazer" um discurso.
  isRetry?: boolean;          // mostra o banner de refação.
  onCancelRetry?: () => void; // sair do modo refação (volta ao discurso em branco).
}

const InputSection: React.FC<InputSectionProps> = ({ onAnalyze, isAnalyzing, initialText, isRetry, onCancelRetry }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [markers, setMarkers] = useState<SectionMarker[]>([]);
  const [isProfessorMode, setIsProfessorMode] = useState(false);
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  // Changed from NodeJS.Timeout to number because we are in a browser environment
  const timerRef = useRef<number | null>(null);

  // Ao entrar em modo refação, carrega o texto original pra pessoa lapidar e
  // descarta qualquer áudio pendente (refação de texto pré-preenche o textarea).
  useEffect(() => {
    if (initialText !== undefined) {
      setText(initialText);
      setAudioBlob(null);
    }
  }, [initialText]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setMarkers([]); // Reset markers
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setErrorMsg(null);
      setText(''); // Clear text when recording starts to avoid confusion
      
      // Start timer
      setRecordingDuration(0);
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Acesso ao microfone negado. Permita o acesso para gravar.');
      } else {
        setErrorMsg('Não foi possível acessar o microfone.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setRecordingDuration(0);
    setMarkers([]);
  };

  const addMarker = (label: string) => {
    if (isRecording) {
      setMarkers(prev => [...prev, { label, timestamp: recordingDuration }]);
    }
  };

  // Conversão webm → WAV e leitura em base64 ficam no utilitário compartilhado
  // (utils/audioWav) — o mesmo usado no treino de dicção.

  const handleAnalyze = async () => {
    if (audioBlob) {
      try {
        setErrorMsg(null);
        setIsPreparingAudio(true);
        // webm -> wav (o Gemini não aceita webm). Converte e envia como audio/wav.
        const wavBlob = await convertToWav(audioBlob);
        const base64 = await blobToBase64(wavBlob);
        setIsPreparingAudio(false);
        onAnalyze({
          audioBase64: base64,
          mimeType: 'audio/wav',
          markers: markers.length > 0 ? markers : undefined,
          isProfessorMode
        });
      } catch (e) {
        console.error('Erro ao converter/preparar áudio:', e);
        setIsPreparingAudio(false);
        setErrorMsg("Erro ao processar o áudio. Tente gravar novamente.");
      }
    } else if (text.trim()) {
      onAnalyze({ text: text, isProfessorMode });
    }
  };

  // Áudio pronto para enviar quando existe blob e não está gravando/preparando.
  const audioReady = !!audioBlob && !isRecording && !isPreparingAudio;
  const busy = isAnalyzing || isPreparingAudio;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fadeInUp">
      {/* Banner de refação: contexto de que a pessoa está lapidando o discurso. */}
      {isRetry && (
        <div className="mb-4 flex items-center gap-3 bg-lime-400/10 border border-lime-400/25 rounded-xl px-4 py-3">
          <RotateCcw className="w-5 h-5 text-lime-400 flex-shrink-0" />
          <p className="text-sm text-lime-200 flex-1">
            <span className="font-semibold">Refazendo seu discurso.</span> Aplique as sugestões e veja se a nota sobe. 🌱
          </p>
          {onCancelRetry && (
            <button
              onClick={onCancelRetry}
              className="p-1 text-lime-300/70 hover:text-lime-200 hover:bg-lime-400/10 rounded transition-colors"
              title="Cancelar refação e começar do zero"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
             <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
             <div className="w-3 h-3 rounded-full bg-zinc-600"></div>
             <div className="w-3 h-3 rounded-full bg-zinc-500"></div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsProfessorMode(!isProfessorMode)}
              className={`flex items-center space-x-1 text-xs font-semibold px-2 py-1.5 sm:py-1 rounded transition-colors ${isProfessorMode ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Ativar modo professor para feedback mais didático"
            >
              <GraduationCap className="w-3 h-3" />
              <span>Modo Professor</span>
            </button>
            <span className="hidden sm:inline text-zinc-500 text-xs uppercase tracking-widest font-semibold">Modo de Entrada</span>
          </div>
        </div>
        
        <div className="relative min-h-[16rem] bg-black/50">
          
          {/* Audio Recording UI Overlay */}
          {(isRecording || audioBlob) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-6 bg-black/90 z-10 transition-all">
               {isRecording ? (
                 <div className="flex flex-col items-center w-full">
                    <div className="flex flex-col items-center animate-pulse mb-6">
                      <div className="w-20 h-20 rounded-full bg-lime-400/10 flex items-center justify-center mb-4 ring-1 ring-lime-400/30">
                        <Mic className="w-10 h-10 text-lime-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white tracking-wider font-mono">{formatTime(recordingDuration)}</h3>
                      <p className="text-zinc-400 font-medium mt-2">Gravando sua voz...</p>
                    </div>

                    {/* Marcadores das 5 PARTES do discurso (método clássico de
                        oratória): marque cada momento pra receber feedback por parte. */}
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4 w-full max-w-xl">
                      {SPEECH_PARTS.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => addMarker(label)}
                          className="px-3 py-2.5 sm:py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-300 hover:text-white transition-colors flex items-center"
                        >
                          <Flag className={`w-3 h-3 mr-2 ${MARKER_COLORS[key]}`} /> {label}
                        </button>
                      ))}
                    </div>
                    
                    {markers.length > 0 && (
                      <div className="mt-4 text-xs text-zinc-500 font-mono">
                        Marcadores: {markers.map(m => `${m.label} (${formatTime(m.timestamp)})`).join(', ')}
                      </div>
                    )}
                 </div>
               ) : (
                 <div className="flex flex-col items-center w-full">
                    <div className="w-16 h-16 rounded-full bg-lime-400/10 flex items-center justify-center mb-4 ring-1 ring-lime-400/30">
                      <Sparkles className="w-8 h-8 text-lime-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Áudio Capturado</h3>
                    {isPreparingAudio ? (
                      <p className="text-blue-400 text-sm mb-2 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1 animate-spin" /> Preparando áudio para envio...
                      </p>
                    ) : (
                      <p className="text-green-400 text-sm mb-2">✓ Pronto para análise — clique em “Analisar Discurso”.</p>
                    )}
                    <div className="w-full max-w-md h-12 bg-zinc-900 rounded-full flex items-center px-4 border border-zinc-800">
                       <div className="w-3 h-3 rounded-full bg-lime-400 animate-pulse mr-3"></div>
                       <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-lime-400 w-full opacity-60"></div>
                       </div>
                       <span className="ml-3 text-sm text-zinc-400 font-mono">{formatTime(recordingDuration)}</span>
                    </div>
                    
                    {markers.length > 0 && (
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {markers.map((m, idx) => (
                          <span key={idx} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 border border-zinc-700">
                            {m.label}: {formatTime(m.timestamp)}
                          </span>
                        ))}
                      </div>
                    )}

                    <button 
                      onClick={clearAudio}
                      className="mt-6 text-zinc-500 hover:text-white text-sm flex items-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Descartar gravação
                    </button>
                 </div>
               )}
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-64 bg-transparent text-white p-4 sm:p-6 text-base sm:text-lg leading-relaxed focus:outline-none resize-none placeholder-zinc-700 font-light"
              placeholder="Digite o texto do seu discurso aqui, ou clique no microfone para gravar sua voz (recomendado para análise de tom)..."
              disabled={isAnalyzing}
            />
          )}

          {errorMsg && (
             <div className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-2 rounded-lg flex items-center space-x-2 z-20">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-sm">{errorMsg}</span>
             </div>
          )}
        </div>

        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">

          {isRecording ? (
            <button
              onClick={stopRecording}
              className="flex items-center justify-center space-x-2 px-6 py-2.5 sm:py-2 rounded-lg bg-white hover:bg-zinc-200 text-black transition-all shadow-lg shadow-white/10"
            >
              <div className="w-3 h-3 rounded bg-black"></div>
              <span className="font-semibold">Parar</span>
            </button>
          ) : (
             <button
              onClick={startRecording}
              disabled={busy || !!audioBlob} // Disable if already has audio
              className={`flex items-center justify-center space-x-2 px-4 py-2.5 sm:py-2 rounded-lg transition-all ${
                audioBlob || busy
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
              }`}
            >
              <Mic className="w-5 h-5" />
              <span>Gravar Voz</span>
            </button>
          )}

          <div className="flex items-center gap-3">
             {!audioBlob && (
                <div className="hidden sm:block text-zinc-600 text-sm font-mono">
                  {text.split(/\s+/).filter(w => w.length > 0).length} palavras
                </div>
             )}
             <button
                onClick={handleAnalyze}
                disabled={(!text.trim() && !audioBlob) || busy}
                className={`flex flex-1 sm:flex-initial items-center justify-center space-x-2 px-6 py-2.5 sm:py-2 rounded-lg font-semibold transition-all ${
                  (!text.trim() && !audioBlob) || busy
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    : 'bg-lime-400 hover:bg-lime-300 text-black shadow-lg shadow-lime-400/20 hover:scale-105'
                }`}
             >
                {busy ? (
                  <Sparkles className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span>{isPreparingAudio ? 'Preparando áudio...' : isAnalyzing ? 'Analisando...' : 'Analisar Discurso'}</span>
             </button>
          </div>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        <div className="p-4">
           <h4 className="text-white font-bold mb-2">Fale Naturalmente</h4>
           <p className="text-zinc-500 text-sm">Grave sua voz para que a IA analise também seu tom e emoção.</p>
        </div>
        <div className="p-4">
           <h4 className="text-white font-bold mb-2">Feedback Instantâneo</h4>
           <p className="text-zinc-500 text-sm">Receba notas imediatas sobre clareza, persuasão e tom de voz.</p>
        </div>
        <div className="p-4">
           <h4 className="text-white font-bold mb-2">Refine e Aperfeiçoe</h4>
           <p className="text-zinc-500 text-sm">Use sugestões da IA para reestruturar frases e melhorar o vocabulário.</p>
        </div>
      </div>
    </div>
  );
};

export default InputSection;