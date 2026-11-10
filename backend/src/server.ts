import { buildApp } from './app.js';

const porta = Number(process.env.API_PORT ?? 3333);
const host = process.env.API_HOST ?? '0.0.0.0';

const app = buildApp({ logger: true });

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sinal, () => {
    app.log.info({ sinal }, 'encerrando a API');
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ port: porta, host });
