# EXE PRO Cloud 3.8.1 — Portal Operacional

## Objetivo
Transformar o Portal do Cliente em uma área de uso diário para atendimento, documentos e acompanhamento financeiro.

## Chamados
O cliente pode:
- abrir chamado;
- escolher categoria: Site, SEO, Conteúdo, Financeiro, Suporte ou Outro;
- definir prioridade;
- acompanhar status;
- responder mensagens;
- anexar arquivos ao chamado.

A equipe recebe a central **Atendimento Portal** no EXE PRO Cloud.

Status:
- Aberto;
- Em andamento;
- Aguardando cliente;
- Resolvido;
- Fechado.

## Arquivos
Cliente e equipe podem compartilhar:
- PDF;
- JPG/JPEG;
- PNG;
- WEBP;
- TXT;
- ZIP;
- DOCX;
- XLSX.

Limite: **8 MB por arquivo**.

Os arquivos ficam persistidos no PostgreSQL em `BYTEA`, não no disco temporário da aplicação.

## Comprovantes de pagamento
Perfis Proprietário e Financeiro podem:
- escolher uma cobrança;
- anexar comprovante;
- incluir observação;
- acompanhar conferência.

A equipe pode marcar:
- Aguardando conferência;
- Aprovado;
- Recusado.

A aprovação do comprovante não marca a cobrança como paga automaticamente nesta versão, evitando baixa financeira incorreta.

## Linha do tempo
O Portal mostra uma linha do tempo por cliente com:
- chamados;
- arquivos;
- projetos;
- financeiro, quando o perfil tiver permissão;
- comprovantes.

## Administração
Novo módulo **Atendimento Portal**:
- filtro por cliente;
- chamados;
- arquivos;
- comprovantes;
- resposta ao cliente;
- responsável;
- prioridade;
- status;
- download/upload de arquivos;
- conferência de comprovantes.

O Cliente 360 ganha um resumo operacional com:
- chamados abertos;
- arquivos;
- comprovantes aguardando conferência.

## Permissões
Portal:
- Proprietário: operação + financeiro;
- Financeiro: operação + financeiro;
- Marketing: chamados, arquivos, sites e projetos, sem valores;
- Visualizador: operação sem financeiro.

EXE PRO:
- Gerente, Admin e Super Admin podem operar a central de atendimento;
- gestão de usuários do Portal continua restrita a Admin e Super Admin.

## Segurança de arquivos
- download exige sessão válida;
- arquivo de cliente é filtrado por `lead_id`;
- tipos MIME permitidos são validados;
- tamanho máximo de 8 MB;
- `Content-Disposition` e `X-Content-Type-Options` são usados no download.

## Banco
Novas tabelas aditivas:
- `portal_tickets`;
- `portal_ticket_messages`;
- `portal_files`;
- `portal_payment_proofs`.

Também foi corrigida a ordem do schema WordPress 3.7.1 para instalações PostgreSQL novas. Nenhuma tabela existente é removida.

## Compatibilidade
- PostgreSQL continua central;
- CRM e IDs existentes não mudam;
- Windows ↔ Cloud continua compatível;
- Portal continua em `/portal/`.
