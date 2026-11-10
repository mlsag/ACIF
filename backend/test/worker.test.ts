import { describe, expect, it, vi } from 'vitest';
import { iniciarWorker, tickHeartbeat } from '../src/worker-loop.js';

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('worker', () => {
  it('executa ticks repetidos e para quando solicitado', async () => {
    const tick = vi.fn(async () => {});
    const worker = iniciarWorker({ intervaloMs: 5, tick });

    await esperar(40);
    await worker.parar();
    const chamadasAoParar = tick.mock.calls.length;
    await esperar(30);

    expect(chamadasAoParar).toBeGreaterThanOrEqual(2);
    expect(tick.mock.calls.length).toBe(chamadasAoParar);
  });

  it('continua rodando quando um tick falha', async () => {
    let chamadas = 0;
    const onErro = vi.fn();
    const worker = iniciarWorker({
      intervaloMs: 5,
      tick: async () => {
        chamadas += 1;
        if (chamadas === 1) throw new Error('falha simulada');
      },
      onErro,
    });

    await esperar(40);
    await worker.parar();

    expect(onErro).toHaveBeenCalledTimes(1);
    expect(chamadas).toBeGreaterThanOrEqual(2);
  });

  it('o heartbeat registra uma linha JSON sem dados pessoais', async () => {
    const linhas: string[] = [];
    await tickHeartbeat((linha) => linhas.push(linha))();

    expect(linhas).toHaveLength(1);
    const registro = JSON.parse(linhas[0] ?? '{}') as Record<string, unknown>;
    expect(Object.keys(registro).sort()).toEqual(['em', 'evento', 'processo']);
    expect(registro.evento).toBe('heartbeat');
  });
});
