// ============================================================================
// Conversão de áudio pra WAV — utilitário compartilhado.
//
// O Gemini aceita mp3/wav/ogg/flac/aiff/aac, mas NÃO webm (o formato que o
// MediaRecorder grava no navegador). Então convertemos a gravação pra WAV
// 16kHz mono (suficiente pra fala e leve) usando a Web Audio API — funciona em
// todos os navegadores porque o decodeAudioData lida com webm/opus, ogg e
// mp4/aac. Extraído do InputSection pra ser reusado também no treino de dicção.
// ============================================================================

// Empacota um AudioBuffer mono em um Blob WAV PCM 16-bit.
const encodeWav = (buffer: AudioBuffer): Blob => {
  const samples = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const dataLen = samples.length * 2;
  const view = new DataView(new ArrayBuffer(44 + dataLen));
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataLen, true); writeStr(8, 'WAVE');
  writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); writeStr(36, 'data'); view.setUint32(40, dataLen, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([view], { type: 'audio/wav' });
};

// Converte qualquer Blob de áudio (webm/ogg/mp4...) pra WAV 16kHz mono.
export const convertToWav = async (blob: Blob): Promise<Blob> => {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const decodeCtx = new AudioCtx();
  const decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  decodeCtx.close();
  const targetRate = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetRate), targetRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return encodeWav(rendered);
};

// Lê um Blob como data URL base64 (o que a API espera em audioBase64).
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
