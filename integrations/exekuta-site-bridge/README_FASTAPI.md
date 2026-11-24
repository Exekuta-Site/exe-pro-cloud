# Guia de integração FastAPI — ponte de leads EXEKUTA → EXE PRO Cloud

Este guia é para o site (app.emergent.sh / FastAPI + MongoDB + painel /admin).
O módulo pronto é: `lead_forward_fastapi.py` (nesta pasta).

## 1. Dependência

Adicione ao requirements.txt do site:

    httpx

## 2. Variáveis de ambiente (no ambiente do app Python)

    EXE_PRO_LEAD_SECRET=<mesmo valor de EXE_CLOUD_SITE_LEAD_SECRET no EXE PRO Cloud>
    EXE_PRO_LEAD_ENDPOINT=https://app.exekuta.com.br/api/integrations/site-lead

O segredo é longo e aleatório. Nunca coloque em JavaScript, HTML, campos do
formulário ou repositório público.

## 3. Mapeamento de campos (o que enviar no payload)

| Campo | Obrigatório | Limite |
|---|---|---|
| name | sim (min. 2 chars) | 120 |
| email | sim OU whatsapp (e-mail ou telefone basta) | 180 |
| whatsapp | opcional (10-20 dígitos) | 40 |
| company | opcional | 180 |
| role | opcional | 120 |
| website | opcional (URL http/https) | 300 |
| challenge | opcional | 500 |
| service | opcional | 180 |
| investment | opcional | 120 |
| message | opcional | 4000 |
| sourcePage | sim (default "/") — página de origem | 300 |
| consent | sim (true) | — |
| honeypot | deve ficar vazio (anti-bot) | — |
| eventId | gerado automaticamente (uuid4) — reenvie o MESMO em retries | 180 |
| utm | opcional: source, medium, campaign, term, content (120 cada) | — |

## 4. Ponto de plug no handler do formulário

Regras: chamar do SERVIDOR, nunca do navegador; DEPOIS que o form aceitar o
lead; em background (não bloquear a resposta ao visitante); a resposta do
formulário nunca depende do forward.

    import logging
    from fastapi import APIRouter, BackgroundTasks
    from pydantic import BaseModel, EmailStr
    from integrations.exekuta_site_bridge.lead_forward_fastapi import exe_pro_lead_forward

    logger = logging.getLogger("exe-bridge")
    router = APIRouter()

    class ContactPayload(BaseModel):
        name: str
        email: EmailStr
        whatsapp: str | None = None
        company: str | None = None
        service: str | None = None
        message: str | None = None
        sourcePage: str = "/"

    def _forward_lead(data: dict):
        try:
            result = exe_pro_lead_forward(data)
            logger.info("lead sincronizado: %s", result)
        except Exception as e:
            # lead FOI aceito: não recuse o visitante. Logue e enfileire retry
            # com o MESMO eventId (idempotência no EXE PRO).
            logger.error("forward para EXE PRO falhou: %s", e)

    @router.post("/api/contact")
    async def contact(payload: ContactPayload, bg: BackgroundTasks):
        # 1) sua lógica de aceitação (validações, MongoDB, anti-bot) — como já está
        ...
        # 2) DEPOIS de aceito, agende o forward
        bg.add_task(_forward_lead, payload.model_dump())
        # 3) resposta sempre ok ao visitante
        return {"ok": True}

## 5. Snippet de teste (rode no servidor do site)

    from integrations.exekuta_site_bridge.lead_forward_fastapi import exe_pro_lead_forward

    result = exe_pro_lead_forward({
        "name": "Teste Ponte",
        "email": "teste@exemplo.com",
        "whatsapp": "21999990000",
        "message": "Teste de integracao da ponte",
        "sourcePage": "/contato",
        "consent": True,
        "honeypot": "",
    })
    print(result)  # {"ok": True, "leadId": "site-...", "duplicate": False}

Respostas esperadas do EXE PRO:
- 503 "Integracao do site ainda nao foi configurada na Cloud." → segredo ausente no EXE PRO
- 401 "Assinatura da integracao invalida ou expirada." → segredo diferente nos dois lados OU corpo alterado após assinar
- 400 "O consentimento e obrigatorio." → consent ausente
- 201 {"ok": True, "leadId": "site-...", "duplicate": False} → lead criado
- 200 {"ok": True, "duplicate": True, "leadId": "..."} → reenvio do mesmo eventId (idempotente)

## 6. Checklist final de ativação

1. [ ] App Python criado (repo do site, uvicorn como entrypoint)
2. [ ] MongoDB Atlas externo + MONGO_URI no ambiente do app Python
3. [ ] httpx no requirements.txt
4. [ ] EXE_PRO_LEAD_SECRET configurado (mesmo valor dos dois lados)
5. [ ] Handler do formulário plugando exe_pro_lead_forward em background
6. [ ] DNS exekuta.com.br + www apontando para o app Python
7. [ ] Snippet de teste da seção 5 executado → 201
8. [ ] Lead visível no módulo Leads do painel EXE PRO
