import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Arquivos em sequência: o teste de migration apaga o schema do banco de teste,
    // e os outros testes de banco não podem rodar ao mesmo tempo que ele.
    fileParallelism: false,
  },
});
