# Encaminha leads do site FastAPI (EXEKUTA) para o EXE PRO Cloud.

# Segredo compartilhado: configure EXE_PRO_LEAD_SECRET no ambiente do site
# com o mesmo valor de EXE_CLOUD_SITE_LEAD_SECRET no EXE PRO Cloud.
# Nao coloque esse segredo em JavaScript, HTML, campos do formulario ou repositorio publico.

import hashlib
import hmac
import json
import os
import time
import uuid

import httpx

EXE_PRO_LEAD_ENDPOINT = os.getenv("EXE_PRO_LEAD_ENDPOINT", "https://app.exekuta.com.br/api/integrations/site-lead")
EXE_PRO_LEAD_SECRET = os.getenv("EXE_PRO_LEAD_SECRET", "").strip()


def exe_pro_lead_forward(payload: dict) -> dict:
    """Envia um lead ja aceito pelo formulario do site para o EXE PRO Cloud.

    Retorna {'ok': True, 'leadId': ..., 'duplicate': bool} em caso de sucesso.
    Levanta RuntimeError em caso de falha de configuracao, assinatura ou rede.
    Nunca chame pelo navegador do visitante: chame do servidor, depois que o
    formulario original aceitar o lead.
    """
    if not EXE_PRO_LEAD_SECRET:
        raise RuntimeError("EXE_PRO_LEAD_SECRET nao configurado no site.")

    body = dict(payload)
    body.setdefault("eventId", str(uuid.uuid4()))
    body["source"] = "site-exekuta"
    if not body.get("sourcePage"):
        body["sourcePage"] = "/"

    # O segredo e assinado sobre o corpo exato enviado: serializacao compacta,
    # sem espacos extras, preservando unicode.
    raw_body = json.dumps(body, separators=(",", ":"), ensure_ascii=False)
    timestamp = str(int(time.time()))
    signature = "sha256=" + hmac.new(
        EXE_PRO_LEAD_SECRET.encode("utf-8"),
        (timestamp + "." + raw_body).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    response = httpx.post(
        EXE_PRO_LEAD_ENDPOINT,
        timeout=5.0,
        follow_redirects=False,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "X-EXEKUTA-Timestamp": timestamp,
            "X-EXEKUTA-Signature": signature,
            "X-EXEKUTA-Event-ID": str(body["eventId"]),
        },
        content=raw_body.encode("utf-8"),
    )
    if response.status_code < 200 or response.status_code >= 300:
        raise RuntimeError(f"EXE PRO respondeu HTTP {response.status_code}.")
    result = response.json() if response.content else {}
    if not result.get("ok"):
        raise RuntimeError("EXE PRO recusou o lead.")
    return result
