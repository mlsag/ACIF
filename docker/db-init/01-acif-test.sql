-- Banco usado pelos testes de integração (TEST_DATABASE_URL). Roda só na criação do volume.
-- Num volume já existente: docker compose down -v (apaga o banco local) ou crie manualmente.
CREATE DATABASE acif_test;
