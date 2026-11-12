import type { StatusAprovacao } from '../../src/dominio/valores.js';
import type {
  DocenteRegistro,
  NovoDocente,
  PaginaDocentes,
  UsuarioCredencial,
  UsuarioRepository,
  UsuarioSessao,
} from '../../src/repositories/usuario-repository.js';

/** Usuário guardado em memória: a credencial mais os campos que só a T07 usa. */
export type UsuarioMemoria = UsuarioCredencial & {
  data_cadastro: Date;
  aprovado_por: number | null;
};

/** Repositório falso para testes de rota e service, sem banco. */
export class UsuarioRepositoryMemoria implements UsuarioRepository {
  readonly usuarios = new Map<number, UsuarioMemoria>();
  private proximoId = 1000;

  adicionar(usuario: UsuarioCredencial & Partial<UsuarioMemoria>): void {
    this.usuarios.set(usuario.id, {
      data_cadastro: new Date(),
      aprovado_por: null,
      ...usuario,
    });
  }

  atualizar(id: number, mudancas: Partial<UsuarioMemoria>): void {
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

  async criarDocente(dados: NovoDocente): Promise<'criado' | 'duplicado'> {
    if (await this.buscarPorEmail(dados.email)) return 'duplicado';
    const id = this.proximoId++;
    this.adicionar({
      id,
      nome: dados.nome,
      email: dados.email,
      senha: dados.senhaHash,
      ativo: true,
      papel: 'docente',
      status_aprovacao: 'pendente',
    });
    return 'criado';
  }

  private paraDocente(u: UsuarioMemoria): DocenteRegistro {
    return {
      id: u.id,
      nome: u.nome,
      email: u.email,
      status_aprovacao: u.status_aprovacao,
      data_cadastro: u.data_cadastro,
    };
  }

  async listarDocentes(
    status: StatusAprovacao | undefined,
    pular: number,
    quantidade: number,
  ): Promise<PaginaDocentes> {
    const todos = [...this.usuarios.values()]
      .filter((u) => u.papel === 'docente' && (!status || u.status_aprovacao === status))
      .sort((a, b) => b.data_cadastro.getTime() - a.data_cadastro.getTime() || b.id - a.id);
    return {
      itens: todos.slice(pular, pular + quantidade).map((u) => this.paraDocente(u)),
      total: todos.length,
    };
  }

  async buscarDocente(id: number): Promise<DocenteRegistro | null> {
    const usuario = this.usuarios.get(id);
    return usuario && usuario.papel === 'docente' ? this.paraDocente(usuario) : null;
  }

  async alterarStatusDocente(
    id: number,
    para: StatusAprovacao,
    origens: readonly StatusAprovacao[],
    idAdmin: number,
  ): Promise<boolean> {
    const usuario = this.usuarios.get(id);
    if (
      !usuario ||
      usuario.papel !== 'docente' ||
      !(origens as readonly string[]).includes(usuario.status_aprovacao)
    ) {
      return false;
    }
    this.atualizar(id, { status_aprovacao: para, aprovado_por: idAdmin });
    return true;
  }
}
