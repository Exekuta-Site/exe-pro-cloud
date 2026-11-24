# EXE PRO 4.0 - Cloudways Production Checklist

## Pós-merge

- [x] EXE PRO 4.0 merged into main
- [x] CI Build Validation aprovado
- [ ] Cloudways deployment iniciado
- [ ] Logs de deploy verificados
- [ ] Migration de banco executada
- [ ] Variáveis de ambiente conferidas
- [ ] Rotas de automação validadas
- [ ] Dashboard administrativo validado
- [ ] Rollback definido

## Fluxo seguro

main
  -> Cloudways Deploy
  -> Build
  -> Database migration
  -> Health check
  -> Produção

## Componentes EXE PRO 4.0

- Automation Core
- Eventos e filas
- Worker
- Scheduler
- Logs
- Dashboard de automações
- Pipeline CI
