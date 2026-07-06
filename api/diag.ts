// /api/diag — diagnóstico SEGURO e público. Expõe SÓ booleanos úteis pra debug
// de configuração (a chave existe? tem o nome errado com VITE_?). NUNCA revela a
// chave, seu tamanho/formato, nem a versão do runtime (evita reconhecimento).
export default function handler(_req: any, res: any) {
  const key = process.env.GEMINI_API_KEY || '';
  res.status(200).json({
    ok: true,
    hasGeminiKey: !!key,
    hasWrongViteName: !!process.env.VITE_GEMINI_API_KEY, // erro comum: nome com VITE_
  });
}
