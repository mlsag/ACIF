// Servidor MSW para os testes (Vitest, ambiente Node). O worker do navegador fica para a T10.

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const servidorMock = setupServer(...handlers);
