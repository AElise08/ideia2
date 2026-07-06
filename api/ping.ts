// Handler minimal sem nenhum import externo. Testa se a Vercel consegue
// rodar TS básico. Se der FUNCTION_INVOCATION_FAILED aqui, o problema
// é da infra da Vercel (config/Node/etc), não do nosso código.
export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, node: process.version, time: new Date().toISOString() });
}
