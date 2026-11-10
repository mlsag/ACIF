export type Tick = () => Promise<void>;

export interface OpcoesWorker {
  intervaloMs: number;
  tick: Tick;
  onErro?: (erro: unknown) => void;
}

export interface WorkerEmExecucao {
  parar(): Promise<void>;
}

/**
 * Laço do worker de envio: executa um tick, espera o intervalo e repete.
 * Na T01 o tick só registra um heartbeat; o consumo da tabela `envios` entra depois.
 * `parar()` cancela o próximo tick e espera o tick em curso terminar.
 */
export function iniciarWorker({ intervaloMs, tick, onErro }: OpcoesWorker): WorkerEmExecucao {
  let ativo = true;
  let timer: NodeJS.Timeout | undefined;
  let emCurso: Promise<void> = Promise.resolve();

  const executar = (): void => {
    emCurso = tick()
      .catch((erro: unknown) => onErro?.(erro))
      .finally(() => {
        if (ativo) timer = setTimeout(executar, intervaloMs);
      });
  };

  executar();

  return {
    async parar() {
      ativo = false;
      if (timer) clearTimeout(timer);
      await emCurso;
    },
  };
}

export function tickHeartbeat(log: (linha: string) => void = console.log): Tick {
  return async () => {
    log(JSON.stringify({ evento: 'heartbeat', processo: 'worker', em: new Date().toISOString() }));
  };
}
