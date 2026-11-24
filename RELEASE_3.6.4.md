# EXE PRO Cloud 3.6.4 — Paridade da Prospecção + correção do Painel Mestre

## Correções
- Painel Mestre deixa de depender dos assets externos que recebiam HTTP 401 e passa a ser incorporado ao HTML da aplicação.
- Resultados da Prospecção Cloud passam a solicitar dados de foto/categoria/aberto agora do Google Places.
- Novo proxy autenticado de fotos em `/api/web/place-photo`, sem expor a chave do Google Places no navegador.

## Paridade visual/funcional com Windows
- cartões do Maps com foto;
- categoria e status;
- telefone, avaliação e presença digital;
- links Site / Maps / Google;
- indicador de lead;
- detecção de registro já salvo no CRM;
- botão **Salvar todos**;
- botão **Salvar todos + CSV**;
- botão **CSV**;
- abas Empresas/Maps, Google, Instagram e Facebook.

## Segurança
A API key do Google Places permanece somente no servidor. As fotos são entregues por endpoint autenticado.

## Compatibilidade
Não altera schema do PostgreSQL, IDs ou sincronização das entidades comerciais.
