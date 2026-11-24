# EXE PRO v4.4.0 — Etapa 3F: prontidão para implantar backups do PostgreSQL Core 1

**Elaborado:** 24/11/2026 · **Status:** preparação documental concluída; decisões pessoais/operacionais pendentes; execução proibida sem autorização específica.  
**Banco-alvo:** `exe-pro-db` (produção, PostgreSQL). **App:** `exe-pro-cloud`. **Shard Cloud:** Core 1 conforme informação do proprietário.  
**Fonte de evidência:** etapas 3B–3E desta auditoria, screenshots apresentados pelo titular e documentação pública dos provedores.  
**Local:** PR #3, branch `auditoria/postgres-backups-etapa3` (rascunho; sem merge, sem webhook e sem deploy).

## 1. Resumo da decisão técnica recomendada

| Item | Proposta em avaliação | Status de aprovação |
| --- | --- | --- |
| Modelo operacional | Backup manual PostgreSQL no Core 1; executar todos os dias, inclusive sábados, domingos e feriados | **Pendente de aprovação da rotina** |
| Horário-base | **19h**, fuso America/Sao_Paulo, **checagem às 19h30** | **Pendente de confirmação** |
| RPO alvo | Até **24h** SE uma cópia correta for concluída a cada 24h; se houver falha/cobertura incompleta o RPO real será maior | **Meta proposta, não comprovada** |
| RTO | A definir após ensaio de restauração em destino isolado | **Pendente** |
| Retenção Shard Cloud | Até 7 pontos recentes + reserva operacional de 1 slot para pré-release | **Requer política de expurgo aprovada separadamente** |
| Retenção externa | **7 diárias + 4 semanais + 3 mensais**, duplicatas podem ser contadas nas classes sem criar objetos desnecessários | **Pendente de aprovação** |
| Armazenamento externo de preferência | **Cloudflare R2, classe Standard, bucket privado** | **Escolha recomendada, não contratada/aprovada** |
| Alternativa | Backblaze B2 privado com critérios equivalentes | Não contratada |
| Controle de integridade | Hash SHA-256 da cópia cifrada, inventário privado sem dados pessoais, teste de restauração isolada | Planejado, **não executado** |
| Recuperabilidade do backup | Um backup listado como disponível em 24/11/2026 no painel, mas nenhum restore realizado | **NÃO COMPROVADA** |

A captura recebida mostrou 1/8 backups disponíveis em `exe-pro-db`, registro 24/11/2026 11:20:52. Esse valor é uma **observação histórica**; não indica necessariamente a situação atual do painel.

## 2. Papéis e autorização — designação nominal pendente

Não presumir identidade, disponibilidade, acesso técnico ou consentimento de nenhuma pessoa.

| Papel operacional | Responsabilidade | Designação formal | Acesso apropriado |
| --- | --- | --- | --- |
| **Aprovador (A)** | Autoriza procedimentos, investimento, expurgo e intervenções | Administrador responsável da EXEKUTA — **identidade de exercício a confirmar** | Gestão e aprovação; não requer acesso diário ao dump |
| **Operador titular (R)** | Backup diário, conferência e registro | **PESSOA NÃO DESIGNADA** | Permissão específica no painel, com MFA |
| **Substituto (R)** | Execução nos finais de semana, feriados, férias e ausências | **PESSOA NÃO DESIGNADA** | Acesso equivalente apenas para continuidade operacional |
| **Custodiante de chaves (R)** | Recuperação do segredo de criptografia, rotação e controle de acesso | **PESSOA NÃO DESIGNADA** | Cofre privado, nunca repositório |
| **Técnico de restauração (R)** | Futuro teste isolado e relatório de RTO/RPO | **PESSOA NÃO DESIGNADA** | Acesso transitório somente à instância de teste, mediante autorização específica |

**Não publicar nomes completos, telefones, senhas ou dados pessoais dos responsáveis no GitHub por conveniência.** A designação nominal e contatos de escala devem ficar em registro operacional com acesso estritamente necessário; no repositório manter a confirmação de que foram designados e as funções.

## 3. Calendário proposto e gatilhos de escalonamento (ainda não ativados)

| Quando | Ação futura após autorização | Critério operacional |
| --- | --- | --- |
| 18h50 todos os dias | Operador confere acesso, estado do banco e espaço disponível; não realiza operações inesperadas | Se não houver slot/vaga de acordo com política aprovada, **suspender execução** e escalar |
| **19h00** | Operador inicia backup manual do banco `exe-pro-db` no painel Shard Cloud | Processo iniciado manualmente, com evidência de execução |
| **19h30** | Verificar status disponível/sucesso no painel e registrar falhas | Se backup não concluiu, registrar incidente e avisar aprovador |
| Após backup bem-sucedido | Executar exportação e cópia externa **somente depois da autorização separada**, cifrar antes da transferência e verificar hash | Não deixar dump sem criptografia exposto em nuvem/dispositivo |
| Toda sexta-feira | Revisar slots livres, últimos pontos, cópias externas, incidentes e escala de fim de semana | Pendente de operador e substituto |
| Antes de qualquer deploy/migração | Novo ponto de backup após aprovação, verificar disponibilidade de slot e restaurabilidade aplicável | **Não fazer deploy** se proteção anterior insuficiente |
| Mensal | Conferir custos, espaço, permissões, necessidade de retenção e último restore de prova | RTO não pode ser declarado sem teste |
| Em falha de backup / indisponibilidade | Registrar, notificar responsável e revisar necessidade de suspender alterações | Nenhum retry automático nem supressão de erro sem decisão |

**Observação:** não foi configurado qualquer lembrete, automação ou serviço que efetivamente agende/executa este calendário. Horário e escala precisam ser aceitos pelo proprietário; uma operação manual diária requer cobertura humana real, inclusive aos finais de semana.

## 4. Decisão de armazenamento: R2 recomendado, B2 como alternativa

### Cloudflare R2 Standard — escolha técnica proposta

**Vantagens documentadas (verificar na contratação):**
- 10 GB-mês gratuitos na classe Standard, US$ 0,015 por GB-mês além da franquia; uso de operações A/B sujeito a limites gratuitos e cobranças adicionais; sem egress direto cobrado pelo R2.
- Buckets são privados por padrão; **não habilitar domínio público, `r2.dev`, CDN nem site público** para backups. Não depender apenas da privacidade padrão: validar configuração antes de qualquer envio.
- Controles de acesso por credenciais de API separadas, escopo restrito ao bucket necessário e política de rotação.
- Avaliar locks/versões e retenção imutável quando disponível, testando conflitos com regras de lifecycle; nunca ativar limpeza automática antes de política de preservação aprovada.

**Limitações e requisitos:**
- **Não foi criada conta, bucket, chave de API, integração, cobrança ou transferência de dados.**
- A existência de Cloudflare DNS no site institucional não demonstra que a mesma conta possui R2 ativo ou pode ser usada para backups do banco.
- Exigir criptografia **do lado do cliente** antes do upload, com chave gerenciada separadamente; criptografia em trânsito/repouso do provedor não substitui essa precaução para cópia de dados pessoais.
- Revisar termos contratuais, região e transferências internacionais sob LGPD com profissional competente.

### Backblaze B2 — alternativa

- Primeiro 10 GB gratuitos; preço anunciado em página oficial em torno de US$ 6,95/TB-mês, sujeito a termos, localidade e eventuais custos de operações/saída.
- Mesmos requisitos de bucket privado, criptografia pré-upload, MFA, proteção contra exclusão, controle de chaves e recuperação isolada.

### Custos somente como cenários de referência

São estimativas **apenas do armazenamento dos objetos**, para até 14 versões, considerando franquias livres e objeto estável no mês. **71 MB de DB utilizado NÃO é o tamanho real do backup.** Não incluem impostos, ferramentas, jornada humana, câmbio, transferências adicionais, plano do provedor ou suporte.

| Tamanho hipotético por backup cifrado | Total externo | R2 Standard / mês | B2 / mês aprox. |
| --- | ---: | ---: | ---: |
| 100 MB | ~1,4 GB | ~US$ 0 | ~US$ 0 |
| 1 GB | ~14 GB | ~US$ 0,06 | ~US$ 0,03 |
| 5 GB | ~70 GB | ~US$ 0,90 | ~US$ 0,42 |

**Risco operacional maior que o preço por GB:** o Core 1 não executa os backups automaticamente. Reservar mão de obra diária e pessoas de cobertura; estimativa anterior de 15 min/dia = 7,5 horas em 30 dias (não comprovada por medição).

## 5. Checklist de implantação segura — SOMENTE PLANEJAMENTO

### Gate A — Pessoas, calendário e autorização

- [ ] Designar operador titular com disponibilidade e treinamento
- [ ] Designar substituto e escala de finais de semana/feriados
- [ ] Definir custodiante de chaves e procedimento de recuperação de acesso
- [ ] Aprovar horário 19h/19h30 e avaliar se RPO de 24h atende dados comerciais/financeiros
- [ ] Identificar quem pode aprovar expurgos, custos e intervenções
- [ ] Definir canal de alertas, comprovação diária e plano de ausência
- [ ] Aprovar formalmente se a rotina manual diária é sustentável no Core 1

### Gate B — Destino e proteção externa (sem operação até nova autorização)

- [ ] Aprovar R2 Standard ou B2, orçamento inicial e titularidade da conta
- [ ] Avaliar contrato, armazenamento, região e privacidade sob a LGPD
- [ ] Autorizar **separadamente** criação do bucket privado; conferir ausência de acesso público
- [ ] Definir acesso mínimo, MFA e mecanismo de auditoria de acessos
- [ ] Definir criptografia autenticada pré-upload, armazenamento separado e recuperação da chave
- [ ] Definir verificação de SHA-256, inventário, versionamento e retenção
- [ ] Testar com **arquivo sintético sem dados reais**, apenas após autorização de criar ambiente de armazenamento
- [ ] Validar custo medido e confirmar se volume fica na franquia gratuita

### Gate C — Primeira operação real (PROIBIDA NESTA ETAPA)

- [ ] Autorização expressa para criar novo backup do PostgreSQL, se necessário
- [ ] Autorização expressa para download/exportação e manuseio de dados de produção
- [ ] Plano de cifragem e destino aprovado antes de obter arquivo real
- [ ] Hash e conferência de upload da cópia cifrada, sem publicar dados pessoais
- [ ] Políticas de expurgo e resposta a incidente autorizadas; **nunca excluir o único ponto observável ou o último ponto restaurável**
- [ ] Não promover mudanças de produção antes de resolver backup e rollback adequados

### Gate D — Prova de restauração (ETAPA FUTURA SOB AUTORIZAÇÃO)

- [ ] Aprovar instância PostgreSQL temporária e isolada, custos e rede
- [ ] Proibir comunicação com WordPress, WhatsApp, faturamento, jobs e serviços de produção
- [ ] Confirmar formato do backup e compatibilidade de versão/roles/extensions
- [ ] Autorizar uso controlado de dados, restaurar **somente na instância separada**
- [ ] Verificar esquema, tabelas, agregados, consistência, RPO e medir RTO
- [ ] Limpar ambiente de teste conforme plano aprovado e registrar evidência
- [ ] Só então marcar **RESTORE VERIFICADO** no diagnóstico

## 6. Condições pendentes / aceite do proprietário

| Campo de aceite | Proposta para decisão | Situação |
| --- | --- | --- |
| Operador titular | Pessoa a indicar pelo proprietário | **Não definido** |
| Substituto | Pessoa a indicar pelo proprietário | **Não definido** |
| Custódia de chave | Pessoa/cofre a indicar | **Não definido** |
| Horário | 19h, verificação 19h30, todos os dias | **Proposto; aguardando confirmação** |
| Storage | Cloudflare R2 Standard privado | **Recomendado; aguardando aprovação** |
| Limite estimado de gasto em storage | Inicialmente US$0 dentro da franquia, sem garantia; limite a aprovar após tamanho do backup conhecido | **Não aprovado** |
| Retenção externa | 7/4/3 | **Proposta; aguardando confirmação** |
| Expurgo e ocupação dos 8 slots | Decisão manual e autorização específica | **Não autorizado** |
| Primeira cópia do banco / download / restore | Nenhuma operação autorizada | **Bloqueado** |

A aprovação para **elaboração deste documento** não autoriza compras, configuração de Cloudflare, operação sobre banco de produção nem transferências de dados. Confirmar separadamente as pessoas, frequência, destino e depois cada operação sensível.

## 7. Referências verificadas

- Shard Cloud Backups: https://shardcloud.app/pt-br/resources/backups
- Shard Cloud Plan comparison: https://shardcloud.app/pt-br/resources/plan-comparison
- Cloudflare R2 Pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 buckets private: https://developers.cloudflare.com/r2/buckets/create-buckets/
- Cloudflare R2 public access controls: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Cloudflare R2 bucket locks: https://developers.cloudflare.com/r2/buckets/bucket-locks/
- Backblaze B2 pricing: https://www.backblaze.com/cloud-storage/pricing

**Conclusão:** preparo documental completo. Responsáveis pessoais, horário, fornecedor e execução seguem pendentes de decisão. Sem alterações em produção, no Shard Cloud ou em contas de terceiros.
