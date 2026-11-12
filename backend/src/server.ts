import { buildApp } from './app.js';
import { lerConfigAuth } from './config.js';
import { PrismaCanalRepository } from './repositories/canal-repository.js';
import { PrismaComunicadoRepository } from './repositories/comunicado-repository.js';
import { criarPrismaClient } from './repositories/prisma.js';
import { PrismaUsuarioRepository } from './repositories/usuario-repository.js';
import { AuthService } from './services/auth-service.js';
import { ComunicadoService } from './services/comunicado-service.js';
import { DocenteService } from './services/docente-service.js';

const porta = Number(process.env.API_PORT ?? 3333);
const host = process.env.API_HOST ?? '0.0.0.0';

const config = lerConfigAuth();
const prisma = criarPrismaClient();
const usuarioRepository = new PrismaUsuarioRepository(prisma);
const authService = new AuthService(usuarioRepository);
await authService.aquecer();

const comunicadoService = new ComunicadoService(
  new PrismaComunicadoRepository(prisma),
  new PrismaCanalRepository(prisma),
);

const app = buildApp({
  logger: true,
  auth: { config, authService },
  comunicados: { comunicadoService },
  docentes: { docenteService: new DocenteService(usuarioRepository) },
});

if (config.usandoSegredoDev) {
  app.log.warn('JWT_SECRET ausente: usando o segredo de desenvolvimento (proibido em produção)');
}

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sinal, () => {
    app.log.info({ sinal }, 'encerrando a API');
    void app
      .close()
      .then(() => prisma.$disconnect())
      .then(() => process.exit(0));
  });
}

await app.listen({ port: porta, host });
