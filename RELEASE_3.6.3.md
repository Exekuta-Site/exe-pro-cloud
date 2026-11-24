# EXE PRO Cloud 3.6.3 — Painel Mestre Cloud

## Objetivo
Trazer para a Cloud o Painel Mestre que já existe no EXE PRO Windows e manter a identidade mais recente sincronizada entre PC e Cloud.

## O que mudou
- novo item **Painel Mestre** no menu lateral da Cloud;
- acesso restrito ao perfil **Super Admin**;
- identidade visual completa: logo, nome, empresa, slogan, texto lateral e cores;
- dados da agência: razão social, documento, telefone, WhatsApp, e-mail, site, endereço e Instagram;
- padrões de proposta: subtítulo, validade, condições de pagamento, PIX, dados bancários e rodapé;
- apresentação institucional e assinatura de mensagens;
- prévia visual em tempo real;
- upload e remoção de logo;
- persistência no PostgreSQL;
- metadados de branding `updatedAt`, `updatedBy` e `brandingVersion`;
- endpoint de sincronização de branding passa a respeitar a versão mais recente em vez de sobrescrever silenciosamente;
- PWA atualizada para 3.6.3.

## Compatibilidade
Não altera schema das entidades de CRM, IDs, propostas, projetos, financeiro ou protocolo de registros. A mudança de sincronização desta release é específica para o branding/Painel Mestre.

## Windows
O pacote Windows 3.6.3 correspondente deve usar o mesmo `updatedAt` para comparar a identidade local e Cloud. A edição mais recente é preservada.
