# EXE PRO v4.4.0 — Etapa 3E: política operacional de backup PostgreSQL Core 1

**Elaborado:** 24/11/2026 · **Ambiente:** Shard Cloud Core 1, instância `exe-pro-db`.  
**Status:** **POLÍTICA DOCUMENTAL REVISADA E FINALIZADA, MAS NÃO ATIVADA**. Cargos/responsabilidades definidos por função; nomes, contrato externo, cronograma efetivo e aprovações de execução permanecem pendentes.  
**Controle de mudanças:** documento de auditoria na branch `auditoria/postgres-backups-etapa3` e PR #3 em rascunho. Nada a mesclar em `main`; sem deploy.

## 1. Fatos comprovados versus decisões propostas

### Fatos com evidência
- O titular informou **Core 1**, cuja funcionalidade de backup automático nativo não está incluída; a UI indica PRO & Enterprise.
- Aba Backups de `exe-pro-db` mostrou **1/8 backups disponíveis**, registro de **24/11/2026 11:20:52**, com ação de download/restore. **Fuso não identificado na interface**.
- Não foi realizada restauração em ambiente isolado; o conteúdo do arquivo, o tamanho, a consistência e o formato do backup **não foram verificados**.
- A Shard Cloud informa oficialmente: backups manuais pelo painel; até **8 slots** por app ou DB; backup automático do Pro ou superior, uma vez ao dia se ativado; pontos mantidos até exclusão.

### Decisões recomendadas (ainda não autorizadas para execução)
- **Periodicidade diária, inclusive sábados, domingos e feriados**, com horário-base **19h no fuso America/Sao_Paulo**; alternativa de horário dependerá da carga operacional.
- **RPO alvo de até 24h**, apenas se houver um backup válido a cada 24h e cópia externa em dia; não é garantia contratual nem substitui PITR.
- **RTO inicial:** não definido. Definir após prova de restore isolado e medições.
- **Retenção externa:** 7 versões diárias, 4 semanais e 3 mensais (até 14 artefatos distintos, estimativa conservadora; uma mesma cópia pode ter múltiplas etiquetas).
- **Slots Shard Cloud:** histórico de até 7 recentes + 1 vaga operacional para pré-release quando necessário. A política NÃO funciona de forma contínua sem decisões explícitas sobre expurgo; backups não expiram automaticamente.
- **Destino externo preferencial para avaliação:** Cloudflare R2 **Standard privado**; alternativa: Backblaze B2 privado. Não foi criado bucket, conta, cobrança, credencial ou política de acesso. Uso de nuvem externa com dados pessoais exige revisão contratual/privacidade e aprovação.

## 2. Matriz de responsabilidades (RACI por função)

| Atividade | Responsável pela execução (R) | Aprovador (A) | Consultado / informado | Situação da designação |
| --- | --- | --- | --- | --- |
| Executar backup manual diário, conferir status e registrar resultado | **Operador de backup designado** | **Administrador principal da EXEKUTA** | Suporte técnico quando falhar | **Nome não informado; designação PENDENTE** |
| Cobertura em ausências, fins de semana e feriados | **Operador substituto** | Administrador principal da EXEKUTA | Operador titular | **Nome não informado; designação PENDENTE** |
| Autorizar download e transferência de cópia externa | Administrador / técnico credenciado | Administrador principal da EXEKUTA | Responsável pela proteção de dados, quando aplicável | **Sem autorização de execução** |
| Gerir chaves de criptografia e acesso ao storage externo | **Custodiante de chaves a designar** | Administrador principal da EXEKUTA | Responsável por segurança/LGPD | **Nome não informado; pendente** |
| Aprovar expurgo de backups do painel e cópias externas | Operador documenta proposta | Administrador principal da EXEKUTA | Custodiante de chaves / técnico | **Não autorizado** |
| Autorizar e acompanhar teste de restauração isolada | Técnico de infraestrutura designado | Administrador principal da EXEKUTA | Operador e responsável por dados | **Não autorizado** |
| Aprovar deploys e mudanças de produção | Responsável técnico | Administrador principal da EXEKUTA | Equipe de desenvolvimento | **Não autorizado nesta etapa** |

**Regra de implantação:** sem operador titular e substituto formalmente designados, a frequência diária **não deve ser anunciada como implantada ou garantida**. Não há dados suficientes para atribuir nomes próprios.

## 3. Rotina operacional proposta (modelo não ativo)

**Todos os dias às 19h de Brasília, inclusive fins de semana**:
1. Abrir painel do banco `exe-pro-db` → Backups e verificar status do backup mais recente, data e vagas disponíveis; **não executar ações até autorização operacional**.
2. Quando o processo vier a ser autorizado, executar manualmente novo backup do DB no painel e aguardar o estado final de disponibilidade.
3. Registrar metadados não sensíveis: data/hora, ID/descrição, status, operador, vagas livres, falhas e ação tomada.
4. Depois de autorizado o fluxo externo, obter cópia por canal seguro, criptografar **antes** de transferir ao destino externo, conferir tamanho e SHA-256 do **arquivo cifrado**; nunca copiar dump em texto puro para serviço externo.
5. Verificar existência da versão correspondente no armazenamento externo; registrar confirmação sem incluir segredo ou conteúdo de cliente no GitHub.
6. Notificar o Administrador se o backup não concluir ou se o RPO objetivo for excedido; suspender mudanças de risco até definir solução.

**Às 19h30:** janela sugerida de checagem/escalação de erro. **Sábados, domingos e feriados:** operador substituto precisa estar disponível se o titular não puder executar. Não há lembrete/agendamento automático ativo.

**Semanalmente:** revisar integridade de cópias cifradas, slots ocupados, vazão, consumo e tentativas mal sucedidas.  
**Mensalmente:** revisar LGPD, retenção e custos; conferir estado do último restore isolado (quando existir) e avaliar se o nível de esforço do Core 1 continua adequado.  
**Antes de deploy/migração:** backup adicional somente sob aprovação separada e após haver vaga; não usar a operação de restauração no ambiente de produção.

## 4. Limites: 8 slots e preservação de pontos

- O primeiro backup é o **registro visível de 24/11/2026**; **não foi validado por restauração**.
- O sistema mostra 1/8; é incorreto presumir que a Shard Cloud elimina automaticamente o backup mais antigo.
- Sem política de expurgo autorizada, aproximadamente na **sétima tentativa adicional** de criar um backup diário (partindo de 1 backup e mantendo uma vaga livre) a reserva estará esgotada. O dia exato dependerá de execuções reais. Isso torna necessária autorização futura para rotação.
- **Proibido apagar** o único ponto disponível, o último ponto pré-incidente ou o único ponto recuperável; não eliminar pontos apenas para liberar espaço sem prova de novos pontos e autorização específica.
- Uma política 7 diárias + 4 semanais + 3 mensais deve usar **armazenamento externo**, não tentar reter 14 backups nos oito slots do painel.

## 5. Comparação de destinos externos e custos (consulta em 24/11/2026)

### Opção A — Cloudflare R2 (recomendação para avaliação)
- Cloudflare R2 Standard: **US$ 0,015 por GB-mês** fora da franquia, **10 GB-mês gratuitos/mês**, até 1 milhão de operações classe A e 10 milhões classe B gratuitos mensais; tráfego de saída R2 sem cobrança de egress.
- Para uma rotina de poucas dezenas de objetos/mês, os custos de operação provavelmente estarão dentro da franquia, mas isso precisa ser confirmado com uso real.
- Bucket **privado**, sem domínio público e sem credenciais na aplicação; criptografia de ponta a ponta do **artefato no cliente antes do upload**, chave separada, MFA e privilégios mínimos.
- Classe Standard preferida; a Infrequent Access tem cobrança de recuperação e retenção mínima e **não** recebe a franquia gratuita.

Fonte: https://developers.cloudflare.com/r2/pricing/ (atualizada pela Cloudflare em 30/10/2026).

### Opção B — Backblaze B2
- Primeiros **10 GB armazenados gratuitos**; valor divulgado de **US$ 6,95/TB-mês** para armazenamento B2 padrão; saída gratuita até 3 vezes a média de armazenamento e condições para operações conforme página oficial.
- Bucket privado, MFA e criptografia pré-upload; atenção aos termos regionais, cobranças de saída excedente e ao uso real.

Fonte: https://www.backblaze.com/cloud-storage/pricing (consultada em 24/11/2026).

### Estimativa conservadora da retenção externa: até 14 arquivos distintos

**Isto é uma simulação de orçamento, não fatura.** A captura anterior mostrou 71 MB de *armazenamento do DB*, **não** o tamanho do dump/export. O tamanho real do backup e o crescimento só poderão ser medidos com autorização de obtenção/verificação.

| Tamanho hipotético por backup cifrado | Total de 14 versões | R2 Standard, armazenamento/mês | B2, armazenamento/mês aproximado |
| --- | ---: | ---: | ---: |
| 100 MB | ~1,4 GB | ~US$ 0 | ~US$ 0 |
| 1 GB | ~14 GB | ~US$ 0,06 | ~US$ 0,03 |
| 5 GB | ~70 GB | ~US$ 0,90 | ~US$ 0,42 |

Premissas: volume constante durante o mês, 14 versões integralmente armazenadas, franquias gratuitas disponíveis, cobrança de storage apenas, sem impostos, câmbio, custos de pessoal, ferramentas, operações excedentes, recuperação ou transferência de outros provedores; cobrança de GB-mês pode ter regras de arredondamento (R2) e medir uso médio diário. Valores internacionais em US$, **não convertidos para R$** por inexistir cotação/contrato específico nesta etapa.

**Custo operacional frequentemente mais importante:** o plano Core 1 exige presença humana diária, inclusive feriados e fins de semana, e revisões de segurança. Uma hipótese de 15 min por dia corresponde a aproximadamente 7,5 horas por 30 dias, **fora** testes mensais, incidentes, transferências e gestão de chaves. A hipótese de tempo deverá ser medida na primeira execução e multiplicada pelo custo interno/hora da equipe.

### Alternativa: upgrade Shard Cloud Pro
A plataforma lista preços **'a partir de'** para Core e Pro em modalidade anual, e backup automático diário no Pro quando ativado; não inferir que a diferença do valor público representa a fatura real do Core 1 nem autoriza contratação. Revisar cotação na conta antes de decisão.

Fonte: https://shardcloud.app/pt-br/resources/backups

## 6. Custódia, LGPD e controles obrigatórios antes da primeira cópia externa

1. Avaliar onde o fornecedor externo guarda/processa os dados, termos/DPA aplicáveis, transferência internacional, prazo de exclusão e base contratual sob a LGPD, conforme responsabilidades da EXEKUTA.
2. Permitir somente o menor acesso possível: login/MFA da conta separada, tokens com escopo limitado ao bucket e registro de acessos.
3. **Criptografar localmente, antes do envio**, usando mecanismo moderno de criptografia autenticada e gerenciador de segredos. Não escrever chave em README, arquivo `.env` do GitHub ou metadados do bucket.
4. Manter **cópia de recuperação da chave em cofre independente** (com autorização de acesso e plano de recuperação). Uma cópia cifrada sem chave acessível não será restaurável.
5. Ativar proteção contra exclusão/versões imutáveis se suportada pelo produto/plano, e testar aplicação da política sem expor dados.
6. Registrar **SHA-256 do arquivo cifrado** e data/hora; o hash comprova transferência/identidade de bytes quando conferido, **não prova consistência lógica ou que o banco possa ser restaurado**.
7. Testar restauro apenas em **instância PostgreSQL separada e isolada**, com autorizações específicas, bloqueio de integrações e limpeza posterior de dados.

## 7. Critérios antes da ativação e próximas decisões

| Decisão pendente | Estado |
| --- | --- |
| Operador titular identificado pelo nome e acesso autorizado | PENDENTE |
| Operador substituto, com cobertura de fins de semana | PENDENTE |
| Custodiante de chaves e plano de recuperação do cofre | PENDENTE |
| Horário das 19h e RPO-alvo ≤24h adequados ao CRM | PENDENTE DE ACEITE OPERACIONAL |
| Destino externo R2 versus B2 aprovado e contrato/LGPD revisados | PENDENTE |
| Primeira exportação de backup e criptografia | **NÃO AUTORIZADA** |
| Criação de bucket, tokens e eventuais cobranças | **NÃO AUTORIZADA** |
| Rotação/exclusão de backups do Shard Cloud | **NÃO AUTORIZADA** |
| Teste de recuperação isolada | **NÃO AUTORIZADO** |
| Alteração do plano Core 1 e deploy | **NÃO AUTORIZADOS** |

**Próxima etapa sugerida (3F):** designar nominalmente operador e substituto, aprovar horário e escolher **um** destino externo com política de custódia. Preparar checklist executável e, somente se houver autorização **separada e posterior**, configurar storage ou movimentar dados. Nenhum lembrete foi criado.

**Encerramento da Etapa 3E:** política operacional pronta para revisão/aceite, matriz de papéis e cenários financeiros documentados. Execução não iniciada; recuperabilidade do PostgreSQL continua não comprovada.
