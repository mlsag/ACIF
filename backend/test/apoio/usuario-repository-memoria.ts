import type {
  UsuarioCredencial,
  UsuarioRepository,
  UsuarioSessao,
} from '../../src/repositories/usuario-repository.js';

/** Repositório falso para testes de rota e service, sem banco. */
export class UsuarioRepositoryMemoria implements UsuarioRepository {
  readonly usuarios = new Map<number, UsuarioCredencial>();

  adicionar(usuario: UsuarioCredencial): void {
    this.usuarios.set(usuario.id, usuario);
  }

  atualizar(id: number, mudancas: Partial<UsuarioCredencial>): void {
    const atual = this.usuarios.get(id);
    if (!atual) throw new Error(`usuário ${id} não existe`);
    this.usuarios.set(id, { ...atual, ...mudancas });
  }

  async buscarPorEmail(email: string): Promise<UsuarioCredencial | null> {
    return [...this.usuarios.values()].find((u) => u.email === email) ?? null;
  }

  async buscarPorId(id: number): Promise<UsuarioSessao | null> {
    const usuario = this.usuarios.get(id);
    if (!usuario) return null;
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      ativo: usuario.ativo,
      papel: usuario.papel,
      status_aprovacao: usuario.status_aprovacao,
    };
  }
}
