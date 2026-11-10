import { iniciarWorker, tickHeartbeat } from './worker-loop.js';

const intervaloMs = Number(process.env.WORKER_INTERVALO_MS ?? 5000);

const worker = iniciarWorker({
  intervaloMs,
  tick: tickHeartbeat(),
  onErro: (erro) => console.error(JSON.stringify({ evento: 'erro_tick', erro: String(erro) })),
});

console.log(JSON.stringify({ evento: 'worker_iniciado', intervaloMs }));

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sinal, () => {
    console.log(JSON.stringify({ evento: 'worker_encerrando', sinal }));
    void worker.parar().then(() => process.exit(0));
  });
}
