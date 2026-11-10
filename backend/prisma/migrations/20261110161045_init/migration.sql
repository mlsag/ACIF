-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "senha" VARCHAR(255) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_cadastro" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "papel" VARCHAR(20) NOT NULL,
    "status_aprovacao" VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "aprovado_por" INTEGER,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" SERIAL NOT NULL,
    "ra" VARCHAR(20) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "telefone" VARCHAR(20),
    "curso" VARCHAR(120) NOT NULL,
    "turma" VARCHAR(20),
    "periodo" VARCHAR(20) NOT NULL,
    "termo" VARCHAR(20) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_cadastro" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentimento_lgpd_em" TIMESTAMPTZ(3) NOT NULL,
    "email_confirmado_em" TIMESTAMPTZ(3),

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunicados" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "titulo" VARCHAR(200),
    "conteudo" TEXT,
    "data_criacao" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_envio" TIMESTAMPTZ(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'rascunho',
    "prompt_original" TEXT,
    "variaveis" JSONB,
    "filtro_destinatarios" JSONB,
    "canais" JSONB NOT NULL DEFAULT '[]',
    "data_agendada" TIMESTAMPTZ(3),

    CONSTRAINT "comunicados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunicado_versoes" (
    "id" SERIAL NOT NULL,
    "id_comunicado" INTEGER NOT NULL,
    "id_canal" INTEGER NOT NULL,
    "assunto" VARCHAR(200),
    "corpo_template" TEXT NOT NULL,
    "origem" VARCHAR(10) NOT NULL,
    "editado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "comunicado_versoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canais" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(30) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "canais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "envios" (
    "id" SERIAL NOT NULL,
    "id_comunicado" INTEGER NOT NULL,
    "id_aluno" INTEGER NOT NULL,
    "id_canal" INTEGER NOT NULL,
    "data_envio" TIMESTAMPTZ(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "mensagem_erro" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "proxima_tentativa" TIMESTAMPTZ(3),
    "id_externo" VARCHAR(255),

    CONSTRAINT "envios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_ra_key" ON "alunos"("ra");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_email_key" ON "alunos"("email");

-- CreateIndex
CREATE UNIQUE INDEX "comunicado_versoes_id_comunicado_id_canal_key" ON "comunicado_versoes"("id_comunicado", "id_canal");

-- CreateIndex
CREATE UNIQUE INDEX "canais_nome_key" ON "canais"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "envios_id_comunicado_id_aluno_id_canal_key" ON "envios"("id_comunicado", "id_aluno", "id_canal");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicados" ADD CONSTRAINT "comunicados_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicado_versoes" ADD CONSTRAINT "comunicado_versoes_id_comunicado_fkey" FOREIGN KEY ("id_comunicado") REFERENCES "comunicados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicado_versoes" ADD CONSTRAINT "comunicado_versoes_id_canal_fkey" FOREIGN KEY ("id_canal") REFERENCES "canais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios" ADD CONSTRAINT "envios_id_comunicado_fkey" FOREIGN KEY ("id_comunicado") REFERENCES "comunicados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios" ADD CONSTRAINT "envios_id_aluno_fkey" FOREIGN KEY ("id_aluno") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios" ADD CONSTRAINT "envios_id_canal_fkey" FOREIGN KEY ("id_canal") REFERENCES "canais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
