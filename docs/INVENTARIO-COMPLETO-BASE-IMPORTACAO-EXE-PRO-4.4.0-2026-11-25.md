# EXE PRO v4.4.0 — Inventário completo dos arquivos acrescidos à base de importação

**Registro:** 25/11/2026. **Origem:** objetos Git (trees recursivas) do repositório privado `Exekuta-Site/exe-pro-cloud`; **somente leitura do código**. Documento criado em branch isolada, sem merge ou deploy.

**Comparação exata:** `main` `839f478a0a5612412ff355f5cadf987ddcc90fa8` → `auditoria/4.4.0-importacao` `2fdde5bec7baaab36c5147f686ff8025c8304495`.

- Árvore Git principal: **2 blobs de arquivo**, sem diretórios.
- Árvore Git de auditoria: **302 blobs de arquivo** e **61 árvores de diretório**; `truncated=false` em ambas as consultas.
- Alterações: **300 arquivos adicionados**, **0 modificados**, **0 excluídos**. Os dois arquivos originais (`README.md` e `.gitignore`) mantiveram exatamente os mesmos blobs Git.
- Primeiro commit `845837e99df67d399c915e7824e6c6d0a837207a`: **299 arquivos** adicionados; segundo commit `2fdde5bec7baaab36c5147f686ff8025c8304495`: **1** arquivo.
- Dados da lista: caminho relativo, tamanho fornecido pelo objeto Git (bytes) e SHA de **blob Git**. **SHA de blob Git não é SHA-256 do arquivo**; não confundir com hashes SHA-256 dos testes prebuilt.
- Tamanho somado dos 300 arquivos novos: **2,390,053 bytes**. A lista inclui fontes, documentos, scripts, assets e ZIPs, e **não representa um release pronto ou a equivalência com produção**.

## Resumo por localização

| Diretório superior | Arquivos adicionados | Soma dos tamanhos (bytes) |
| --- | ---: | ---: |
| `.github` | 2 | 1,270 |
| `(raiz)` | 29 | 370,696 |
| `core` | 38 | 8,882 |
| `docs` | 7 | 8,408 |
| `integrations` | 4 | 11,697 |
| `lib` | 4 | 21,860 |
| `payload` | 7 | 40,376 |
| `tools` | 155 | 941,091 |
| `web` | 54 | 985,773 |
| **TOTAL** | **300** | **2,390,053** |

## Inventário integral por diretório

### .github (2)

| Caminho do arquivo | Tamanho (bytes) | SHA Git do blob |
| --- | ---: | --- |
| `.github/workflows/ci.yml` | 682 | `7a48a54ff0f5f3949cc815aabafc224f634ae0b9` |
| `.github/workflows/exe-pro-4-build-validation.yml` | 588 | `e3e57e29bce73bfd9430a410a5fbb87024b264bd` |

### (raiz) (29)

| Caminho do arquivo | Tamanho (bytes) | SHA Git do blob |
| --- | ---: | --- |
| `.env.example` | 612 | `63c9b9d83391df16c5dcb6ed5896d3bb7048ef36` |
| `AUDITORIA_IMPORTACAO.md` | 2390 | `74b1e53dac629dd20613f4daddccd8e6fbfeff9c` |
| `CLOUDWAYS_DEPLOY_CHECKLIST.md` | 2175 | `7e281f97d273895890646f7595ae4f8471a06d5b` |
| `GERAR_CHAVES.txt` | 392 | `2b38f4bad22ed6cb5812bf12e25586c7c0ffbef8` |
| `package-lock.json` | 5700 | `070e5ed1314846e29a9d02473053f90cca5da5cd` |
| `package.json` | 1834 | `855f42495eb780caab8a6c339edb5cecd0d8e9b5` |
| `README_CLOUDWAYS.md` | 14467 | `49bfa9b32222b3ca84ce265d0ad327464c6de93c` |
| `RELEASE_3.6.2.md` | 1145 | `57df3b9669a06f318c88f4b2a67e5234b4ecd743` |
| `RELEASE_3.6.3.md` | 1352 | `287f34cbfc47db39913078b17df0b4268db37a97` |
| `RELEASE_3.6.4.md` | 1030 | `d6588e09dfc78e444a5009a506ca068a35f29c65` |
| `RELEASE_3.6.5.md` | 1768 | `9329ab11999f21f95580207ff887cc2595892991` |
| `RELEASE_3.6.6.md` | 1890 | `451d288991103d8b82d4a4bc97f4bbcbd66cf29e` |
| `RELEASE_3.6.7.md` | 2436 | `54bca1147f195efdbb503f86753805e36fdac5d4` |
| `RELEASE_3.6.8.md` | 1527 | `154585562bce986e442594d3d4c7670959968f8a` |
| `RELEASE_3.6.9.md` | 1638 | `75468c27b26da3c99827ae91294c6035ea29d372` |
| `RELEASE_3.7.0.md` | 2745 | `3d18c1a4bd4fa5b90dac48c01a8ff3e9ebc1fa3b` |
| `RELEASE_3.7.1.md` | 2176 | `bebb8b2e8fa6748e771e53400938ffaf30ab9809` |
| `RELEASE_3.8.0.md` | 2842 | `1aa20aaf701cc3be254421f854bf2643afeb4729` |
| `RELEASE_3.8.1.md` | 2734 | `36aa2d3f937a3b4a6f288c67aaa12181f532b591` |
| `RELEASE_3.8.2.md` | 2500 | `75f862d5fd06b7661bf5bb3d3af442320929c36c` |
| `RELEASE_3.8.3.md` | 2721 | `34c90842e24c400888aff237fba47b876b882cd4` |
| `RELEASE_3.8.4.md` | 4094 | `910e4f546f1a0828f8d828a0e3a6aeb811e50f1c` |
| `RELEASE_3.9.0.md` | 3576 | `56bd5304d1aad9ae518e38193ce89f980bc31878` |
| `RELEASE_3.9.1.md` | 4352 | `9c532da284455d1d71808748516be89de1bb839f` |
| `RELEASE_4.1.4.md` | 1234 | `dcde95e0d0df408b057b42f9a0f5c888d57020b2` |
| `RELEASE_4.1.5.md` | 1163 | `93ab31dd4bc16d0db35944a74547feb752285880` |
| `RELEASE_4.2.0.md` | 1517 | `17cf9bc8043e535ce8c2f49039a0fab668700ce1` |
| `RELEASE_4.3.0.md` | 1599 | `10597ed1bc38a6fcd1a48b9b751f9219e8058685` |
| `server.js` | 297087 | `eb6c82400cba37ca9831287f74dbe72a78ed0ae0` |

### core (38)

| Caminho do arquivo | Tamanho (bytes) | SHA Git do blob |
| --- | ---: | --- |
| `core/automation/actions/create-task.js` | 221 | `e8449cf5e55114785d07d1763cf1f1e8b9c0f365` |
| `core/automation/admin/dashboard.js` | 189 | `ccbf713f0a0d6a87fd57fec7280a51bf6384b6f5` |
| `core/automation/admin/event-filter.js` | 203 | `7bd8bb1323be784458f430bc19189964ada81054` |
| `core/automation/admin/history.js` | 192 | `fd004c21b45e19a3507957a3c82d304df4778a83` |
| `core/automation/admin/metrics.js` | 228 | `2625a8c83dd372aacaa06f046b409100f9d4f3c2` |
| `core/automation/admin/postgres-metrics.js` | 251 | `b73291c5c1ccf088f8e4f305ea3af7efff6f483d` |
| `core/automation/admin/README_DASHBOARD.md` | 215 | `5e473e014c585df92d78c17545eda89eedfc6b72` |
| `core/automation/admin/README_POSTGRES_DASHBOARD.md` | 164 | `d62bc93314f16a12675b5297a1bd85ec169011e6` |
| `core/automation/admin/README.md` | 136 | `ad93c9046fb7554593ee69b98194db3901d6660f` |
| `core/automation/admin/status.js` | 188 | `6f31b026a0ae488b569fbfd1706b16ca42dda084` |
| `core/automation/events/registry.js` | 248 | `ea58a5d759339ee39404a7c10d3e82e6053e3136` |
| `core/automation/flows/payment-overdue-flow.js` | 162 | `0f06d299d37ddc179f6742e00ba7277c774e0e09` |
| `core/automation/integrations/finance.js` | 195 | `4520227b93ac199a1163c48ac78f7df11318eb34` |
| `core/automation/integrations/sla.js` | 175 | `00cca3bda6a415b4fe07558c06e8bde589c6a88a` |
| `core/automation/integrations/task-runner.js` | 309 | `5eab363cf7bbf17bd8ffdd57896561045ac67255` |
| `core/automation/integrations/tasks.js` | 686 | `1c3ca2544b343daa97af3303d023f6baeb966f91` |
| `core/automation/integrations/wordpress.js` | 263 | `d316a437701dc14a394ef317f87473c90e70e263` |
| `core/automation/logs/logger.js` | 171 | `063e6e36be1b5111c55852346f190114cf419598` |
| `core/automation/logs/postgres-logger.js` | 370 | `76bea2bb92f7ff2a89dc4aaa194badd95a46134b` |
| `core/automation/queue.js` | 252 | `15c2967d23a030bfec3212a4abc68fc73cc8309d` |
| `core/automation/README_4.0_FLOW.md` | 184 | `67b28e40798a9c51016e7116750ff389a6591933` |
| `core/automation/rules/payment-overdue.js` | 180 | `3dfd2fa11cac5a95d9559eb8883c0d8f7e04172d` |
| `core/automation/scheduler.js` | 396 | `3a6c635fe326150f2da7b88c1ed4b00254fdd76c` |
| `core/automation/server/dashboard-api.js` | 327 | `583dd25649f193165b140b7290b180c7b1726876` |
| `core/automation/server/dashboard-data.js` | 238 | `4bdf9723c0283eb7acfb85aeeaff783762c0092e` |
| `core/automation/server/postgres-dashboard.js` | 258 | `cba6e9cd83467fc2f6be084de1499e53a8915157` |
| `core/automation/server/README_INTEGRATION.md` | 243 | `6ce0682bdfe0a61881324285defaaabbf8997324` |
| `core/automation/server/README_POSTGRES_INTEGRATION.md` | 184 | `52928bfcb9e62f3a3445589db3c3f5b6e0a5268c` |
| `core/automation/server/routes.js` | 219 | `d63efa58d6714f07a309e9bf73704a08f6c07b5e` |
| `core/automation/tests/e2e-payment-overdue.md` | 169 | `362e970f664459abefb2ffca52f9bc096b30f733` |
| `core/automation/tests/payment-flow.md` | 221 | `20f2d26bd5c1f8011d187be6aebca017a3af8fdc` |
| `core/automation/ui/automation-cards.js` | 249 | `2c184bf196be5998dc56c1f0b94a5efc5c2489f7` |
| `core/automation/ui/automation-panel.js` | 225 | `9fed639074b5157b9988d32774ba51072058888c` |
| `core/automation/ui/menu.js` | 167 | `ae67ec4ecd5d83e121eea12e2ff967ad9159bdf9` |
| `core/automation/ui/README_INTERFACE.md` | 176 | `0c3b469a22d2396d2ca17f9a9d005824d9addf49` |
| `core/automation/ui/README_VISUAL_PANEL.md` | 199 | `e142876ebb22d0f640624d39cf7625db1d97025c` |
| `core/automation/ui/rules.js` | 87 | `16f2fb76c36e095606863d14127a530c9a5ea1cc` |
| `core/automation/worker.js` | 342 | `8078dfbf654962cc04d001f8dd4a2e656768db38` |

### docs (7)

| Caminho do arquivo | Tamanho (bytes) | SHA Git do blob |
| --- | ---: | --- |
| `docs/AUDITORIA-FASE2-EXE-PRO-4.4.0.md` | 5229 | `c63db6b3e3217b4cc2c6acb68ca01e6473e3c64c` |
| `docs/EXE_PRO_4_BUILD_TEST_RESULT.md` | 541 | `8fb6d0c55f3100e2efe5f711113a7497d82ed6ff` |
| `docs/EXE_PRO_4_BUILD_VALIDATION.md` | 305 | `d448a0f8de2be20f8a2781f1ef109d51ec249311` |
| `docs/EXE_PRO_4_CLOUDWAYS_PRODUCTION_CHECKLIST.md` | 627 | `a5403e107e45df6bf38be1620a9698b36411766d` |
| `docs/EXE_PRO_4_HOMOLOGACAO_POS_DEPLOY.md` | 503 | `f3dff8c46e5591dc3b52cf47071970a091ff552e` |
| `docs/EXE_PRO_4_PIPELINE_VALIDATION.md` | 687 | `e865330daff618921ad59e145cc233feb0275b18` |
| `docs/EXE_PRO_4_TESTE_FUNCIONAL_CHECKLIST.md` | 516 | `cdca212633f7fed8d3608838705b1acb4269ac30` |

### integrations (4)

| Caminho do arquivo | Tamanho (bytes) | SHA Git do blob |
| --- | ---: | --- |
| `integrations/exekuta-site-bridge/exekuta-site-bridge.php` | 3174 | `90fa0d940673b2f613da7d2af3674ddc0741313a` |
| `integrations/exekuta-site-bridge/lead_forward_fastapi.py` | 2395 | `db3baf2e5c5ec970dcba0858a21fbcb7f01cfb92` |
| `integrations/exekuta-site-bridge/README_FASTAPI.md` | 4445 | `ce8ae9dea9135fbe2401dc1116ad1a0a990368ed` |
| `integrations/exekuta-site-bridge/README.md` | 1683 | `fba66d1333e729eea401c7aa296fc6bd563364b4` |

### lib (4)

| Caminho do arquivo | Tamanho (bytes) | SHA Git do blob |
| --- | ---: | --- |
| `lib/migrations/400_automation_core.sql` | 640 | `1a4cb3adec48d229671c9d08657fa5e28c5b3916` |
| `lib/migrations/401_automation_events.sql` | 292 | `9288c086106770b71010d8c12b778764421787f1` |
| `lib/postgres.js` | 2617 | `71b58d5fe956c39a606d7497cdaf4b54f44146b1` |
| `lib/schema.js` | 18311 | `217a310644a9cadf140e77d18957059a9ba4deca` |

### payload (7)

| Caminho do arquivo | Tamanho (bytes) | SHA Git do blob |
| --- | ---: | --- |
| `payload/index.part00` | 6000 | `f42c90fc4ef74d74fd444cd9a28b6d2157c21aab` |
| `payload/index.part01` | 6000 | `cdc20438c49d4b69e1e36c0aa58b5b43e8c16284` |
| `payload/index.part02` | 6000 | `b21b04227fc0761d2c68d6b1ffc5085a578c85af` |
| `payload/index.part03` | 5868 | `7940bfba5f8a2ebf8c9ca04473c266ef2373e71c` |
| `payload/server.part00` | 6000 | `6c21b70d2b9a2178573975e7ae8d1e5b9a873717` |
| `payload/server.part01` | 6000 | `93586dec85880c1af941c842d04d387a036ebb20` |
| `payload/server.part02` | 4508 | `2b6192fdb112046f0226a84fb46773bd6ef8fd8e` |

### tools (155)

| Caminho do arquivo | Tamanho (bytes) | SHA Git do blob |
| --- | ---: | --- |
| `tools/apply-automation-400.js` | 275 | `3accf2b9acc21e5a5f2e934715883fadc7b8511c` |
| `tools/apply-automation-engine-401.js` | 320 | `8c82f7b4c9d00db7f0b07e1fdadc248150ff07e8` |
| `tools/apply-central-commercial-366.js` | 3825 | `42881d50b3347360218d5b4ef766c25774792bad` |
| `tools/apply-client-fix-369.js` | 3377 | `5a54324421d0d70c8a63f94850a62e6195b06dcc` |
| `tools/apply-client-parity-368.js` | 2763 | `6ebac3d27e40feab3f790cd08bfa292b5126e0f8` |
| `tools/apply-client-portal-380.js` | 3516 | `73470c80c6d0e4e7fe9e0864c79618361b40f5bd` |
| `tools/apply-core-stability-390.js` | 4709 | `1130c6b81d487ea70bb0995d25a55a4a2ea392b5` |
| `tools/apply-master-panel-363.js` | 1333 | `198a05c41b491c7f05608f2af023dbb87c53d3c6` |
| `tools/apply-notifications-367.js` | 3665 | `8d29241a0196f97ea5b4771988adbc60a48cc46f` |
| `tools/apply-perf-security-450.js` | 5314 | `a8990e61a7eff7907f99a396bcebe256057e6215` |
| `tools/apply-portal-docs-383.js` | 3744 | `1d7298766d757772930a8595ffddd549d5266b80` |
| `tools/apply-portal-operations-381.js` | 3756 | `fbe50d44b8e0a159906bfa4a2433ac9b7cdabe1f` |
| `tools/apply-portal-prospecting-451.js` | 31074 | `098f765d1fb5ecfff539bc412528cefd888cd1af` |
| `tools/apply-production-36.js` | 690 | `eade2a11702196f82a0580c76b1d298e17801f36` |
| `tools/apply-prospect-intelligence-365.js` | 2746 | `0d4bf9fc407edf098594e499ce3ce48e02982355` |
| `tools/apply-prospect-parity-364.js` | 6094 | `9cd3ef2feda52ae3e8a2c9684ec300f3923416e6` |
| `tools/apply-recurring-finance-384.js` | 4296 | `48ad6610fe026cb5e0f092290c9e00bb1baadc12` |
| `tools/apply-routing-414.js` | 2622 | `d782119178b0b833ab121e8ef7303b46fcbe4544` |
| `tools/apply-seo-reports-382.js` | 3677 | `892cdfba7f43a8dd4a0a0c713a99e1c550d33cb1` |
| `tools/apply-service-wp-designer-371.js` | 2107 | `7d1bfb65efcf85aba189b473ba3426460651f7db` |
| `tools/apply-site-integration-440.js` | 3563 | `008b4acdae54ffeb7dcd8b7cd0acce8c3a188a4f` |
| `tools/apply-tasks-team-sla-391.js` | 3719 | `8da5608df6714cdd61cdc6910d4255a4ab29d129` |
| `tools/apply-url-hardening-445.js` | 1039 | `b6384b62b224ee155b45cfbba5e5eb814189e042` |
| `tools/apply-visual-parity-361.js` | 716 | `3560df692c62733464bb50ccc7ba238b83e51513` |
| `tools/apply-visual-refinement-362.js` | 9015 | `8dafb1aa1e76c4d1f0f15cbcb61cbe07b48fe9bb` |
| `tools/apply-whatsapp-business-420.js` | 4320 | `2bec8dc3d8880854db1e636b408a0c8a1b234374` |
| `tools/apply-whatsapp-coexistence-430.js` | 7297 | `643bea1b88ed70e75c52e19fa7e2a39664f7100d` |
| `tools/apply-whatsapp-web-415.js` | 3308 | `0f3edb4dc558b4182466a5d959460dc0a6ec2b31` |
| `tools/apply-wordpress-control-370.js` | 3831 | `e86ad2f2992c0af995512dfa72f8b268dca81475` |
| `tools/apply-wp-popup-460.js` | 14806 | `7ae1abd245b5ad1fc21f31aad14bba66533018fc` |
| `tools/billing384/admin.css` | 1574 | `cb165640b78d003e13462cfa1c4cc6bd8d11e876` |
| `tools/billing384/admin.js` | 22671 | `27ff6791ac620b06da850e5a0b7f052dd1221419` |
| `tools/billing384/portal.css` | 1183 | `1daead9017e524ed7dbde48185b5dd6b2889c968` |
| `tools/billing384/portal.js` | 5177 | `bcd7dd5d97140f979c813a5d3b0aa711ff8efb5d` |
| `tools/billing384/routes.txt` | 2752 | `c6390d68d29c9d7c22c9829038354b0d0126b677` |
| `tools/billing384/server-snippet.js` | 25087 | `b76d687082a7454fa2f2715f7d60e6cd4b3fc377` |
| `tools/build-check.js` | 8475 | `a167892ca650af339f8ba73a8ed4d3272e4e4fd7` |
| `tools/client368/browser.css` | 1754 | `0e6806218374ab4536d29fff255b414d21d7ec88` |
| `tools/client368/browser.js` | 12050 | `fd364f9d66eb8a3001a9f44293277ed57c8cff07` |
| `tools/client369/browser.css` | 2480 | `817a94bc7e1d7f2451a28d838a463d2ea0b8fa22` |
| `tools/client369/browser.js` | 22134 | `6686546209a0cef617f15079dfa6dd1b31360e31` |
| `tools/client369/routes.txt` | 342 | `14f7f4e8304fd227be879caab68ed8f18204f9ca` |
| `tools/client369/server-snippet.js` | 2254 | `b807d658b3395a7f674009b1db7fc91bfc494a7b` |
| `tools/commercial366/browser-css.b64` | 2516 | `d677e268b7ee552dcf4de081bd62bed9401bb433` |
| `tools/commercial366/browser-js.b64` | 9024 | `7112f023c48fd581f0a0d6bdffd7996bee31f970` |
| `tools/connector-intake-460.js` | 4851 | `3d9621c522b1bc6286ad372d3d6c89b91193247e` |
| `tools/connector460/connector-upload.zip` | 31368 | `57e9dee6cccbfd71b3f5f6bbf8e41f9073ec408c` |
| `tools/connector460/EXTRACTED.md` | 1656 | `ad1d5fe96c9a71f31587f333b74a720228b27bd3` |
| `tools/connector460/extracted/exe-pro-connector/assets/css/popup.css` | 2450 | `f2868499d0dceb7ee037ef5a416e3c74329a709d` |
| `tools/connector460/extracted/exe-pro-connector/assets/js/popup.js` | 2744 | `7261a552a44d1addd7b2c3513f0ab7249de0206c` |
| `tools/connector460/extracted/exe-pro-connector/CHANGELOG.md` | 4710 | `3057fab984acac9d2858e6a54213174b50e1cc18` |
| `tools/connector460/extracted/exe-pro-connector/docs/INTEGRACAO-EXEKUTA-POPUP.md` | 7033 | `d636bd6132f1a0a0b48bc95e7647be44064da477` |
| `tools/connector460/extracted/exe-pro-connector/DOCUMENTACAO-PROJETO.md` | 2712 | `655b007ce97e9b40f590f5dea1902c404121d11c` |
| `tools/connector460/extracted/exe-pro-connector/exe-pro-connector.php` | 30978 | `ab08d43fda67d7a8d8a7ecac0b058316b00a1ef2` |
| `tools/connector460/extracted/exe-pro-connector/FASE-2.3.6-A-RELATORIO.md` | 377 | `05dacd754cd443321ed4c368a2cf3035891ffc26` |
| `tools/connector460/extracted/exe-pro-connector/FASE-3.0-RELATORIO-TECNICO.md` | 737 | `bc0662096496237bb7758bfb88b2c5dcfba0d588` |
| `tools/connector460/extracted/exe-pro-connector/includes/Admin/Admin.php` | 1645 | `6b51213e2afc632de8b9e5eaf78a897253eb240f` |
| `tools/connector460/extracted/exe-pro-connector/includes/Core/Loader.php` | 430 | `713509a22fe14614efc2b005f88a256b41bb9f09` |
| `tools/connector460/extracted/exe-pro-connector/includes/Core/Plugin.php` | 354 | `d6d25f95341193232deee12f29d488191bc751d7` |
| `tools/connector460/extracted/exe-pro-connector/includes/Frontend/Maintenance.php` | 389 | `95a6dce9bafd8b2ba10e87d0c07b4a0528c5bbc6` |
| `tools/connector460/extracted/exe-pro-connector/includes/Popup/Popup.php` | 15408 | `a5356e90185f5925ce5255cfd85ad7af2e67607f` |
| `tools/connector460/extracted/exe-pro-connector/includes/Reports/Dashboard.php` | 1788 | `477979a35b0f1fd7f0f0cdceac35f8ca2eb31c62` |
| `tools/connector460/extracted/exe-pro-connector/includes/Reports/Experience_Analyzer.php` | 321 | `08e2e58d4e13de69402b3582c74f941c50d33335` |
| `tools/connector460/extracted/exe-pro-connector/includes/Reports/Improvements_Analyzer.php` | 686 | `bcb21952ed98ec07171e93944698cd9ae7f3f498` |
| `tools/connector460/extracted/exe-pro-connector/includes/Reports/Insights_Generator.php` | 418 | `39fdd43216a36eccc68b651763430a3b1078f397` |
| `tools/connector460/extracted/exe-pro-connector/includes/Reports/PDF_Exporter.php` | 1045 | `2e2f41de13af4329c924e776c04fa95032e57166` |
| `tools/connector460/extracted/exe-pro-connector/includes/Reports/Performance_Analyzer.php` | 389 | `1b2841c50f5a90efc71c5458ba4fcb8e95bc629a` |
| `tools/connector460/extracted/exe-pro-connector/includes/Reports/Reports_Manager.php` | 1817 | `334f858f96454c8150e7b9b8c53bbe60024902b1` |
| `tools/connector460/extracted/exe-pro-connector/includes/Reports/SEO_Analyzer.php` | 939 | `0d63f3242212bcb739bda3124cc3b9584ff2d2c5` |
| `tools/connector460/extracted/exe-pro-connector/includes/REST/Controller.php` | 1930 | `ad776831c3bb5815b0b3b9359f386d10bd758431` |
| `tools/connector460/extracted/exe-pro-connector/includes/Security/Authentication.php` | 896 | `eae6352c843d7137d548be6fa31bed802a1b2501` |
| `tools/connector460/extracted/exe-pro-connector/includes/Settings/Repository.php` | 314 | `2e144124c4a64528528eca427429b543ba740144` |
| `tools/connector460/extracted/exe-pro-connector/readme.txt` | 1664 | `080b7ae17daae69d68d565ba0dfa36fbacdf0816` |
| `tools/core390/admin.css` | 2292 | `76455657d7e3eb19ebb287c4aa37926cf1a53a11` |
| `tools/core390/admin.js` | 11932 | `2a9aa2ddc74364395056e1da628a41cf2c275b6e` |
| `tools/core390/module-manifest.json` | 2681 | `6b25ae51a14776586b1d814c1d3486f3291870a7` |
| `tools/core390/routes.txt` | 2518 | `8cf7d214d5f75a498044173a1471087804272b3f` |
| `tools/core390/server-snippet.js` | 11247 | `38af788557bb80c7dc1b9178f7831dc26caf1c59` |
| `tools/hash-password.js` | 438 | `7e49945e1783eda29f8dd1e21b221c83eb508ffe` |
| `tools/healthcheck.js` | 313 | `3ba1e693d79cbf3df9803b93d01467c48d4180f3` |
| `tools/import-sqlite.js` | 4590 | `a09ede283f91a4eb07c95406a4f054b669d5aa50` |
| `tools/master363/browser-css.b64` | 1408 | `d1662e3d2c4c5983eb1dd3054bf67955740396ab` |
| `tools/master363/browser-js.b64` | 6580 | `13a4145d907dc5088a6a7f0fb081fb4b298e6673` |
| `tools/master363/patch.b64` | 2424 | `0a76f6d652e775d73379f67df029b462bbdd0f7a` |
| `tools/materialize.js` | 955 | `b090a9d67aeee820fa93f5afa82d928bdeb0d7a5` |
| `tools/migrate.js` | 315 | `1322d81d3c88536d64d60a430ceaa9c6fe08f30b` |
| `tools/notif367/browser.css` | 1928 | `75488ac4bc10de9241d87324967685c4794d5b44` |
| `tools/notif367/browser.js` | 16320 | `08b7a01815c074128cd6ffdb03b0be5e423759f2` |
| `tools/notif367/routes.txt` | 3102 | `2a625200b1c88a08f26aad89439f4856967efe8a` |
| `tools/notif367/server-snippet.js` | 16876 | `44193928edd595bf596db62a9979f0192367a4bc` |
| `tools/patch36/part00` | 5000 | `8688c590b89a1ce5967188a23fda7be9040ee0aa` |
| `tools/patch36/part01` | 5000 | `302c10aaa6a1bfc4a86ef4d1c81a3ab851570a5f` |
| `tools/patch36/part02` | 5000 | `486179d95e52f8f9b03c3efeab583760acb0f08c` |
| `tools/patch36/part03` | 5000 | `5ec8ab30d8359196a7f5665e68549f0a3cf68518` |
| `tools/patch36/part04` | 20 | `8e32d69b73d9a7e7cec02f10d0a9048098886495` |
| `tools/portal380/admin.css` | 1029 | `ac6129b12b11e4c106665edc7add36e1365ccc15` |
| `tools/portal380/admin.js` | 11088 | `36239215fc699682db17d113b44eeaa1684088cc` |
| `tools/portal380/portal.html` | 18632 | `95d51cd5e8870b6ef93bb5dd42c816eae0486f1e` |
| `tools/portal380/routes.txt` | 3372 | `426e26c5d1d567dd4dca2382c28bf55ebc6b46ac` |
| `tools/portal380/server-snippet.js` | 15523 | `1b13a281032896255a418b2eee9dca94b9fc1a9c` |
| `tools/portal381/admin.css` | 1680 | `247dd9f63a8f8cb4f355792dc43a213722f389a8` |
| `tools/portal381/admin.js` | 15653 | `454d03cff01dd62a735d8bf8552b323c924b1171` |
| `tools/portal381/portal.css` | 3692 | `b7e28159efb46b058a494ddebd2a8f65223751ee` |
| `tools/portal381/portal.js` | 15661 | `7fac2afa36682e54f9584872bdf309c1d3513b93` |
| `tools/portal381/routes.txt` | 6594 | `967e20ce5767af6b67a630606a0ba061c072cbbb` |
| `tools/portal381/server-snippet.js` | 17201 | `db4cad178495283123c2d0a0f42aa6ed719f9bce` |
| `tools/portal383/admin.css` | 1433 | `c3a20204183f217de075702140c19678140451ff` |
| `tools/portal383/admin.js` | 11452 | `232fd99ab8a24dec36ee8c4db4cbb678d9e1251c` |
| `tools/portal383/portal.css` | 2669 | `93cf535da01f445ba20ca750dde49f34a381dc29` |
| `tools/portal383/portal.js` | 10803 | `523990860091ebf79656ad6692edf44326962d1a` |
| `tools/portal383/routes.txt` | 2051 | `6006608dd6c876aa275af0f2bf450a23bd50fca6` |
| `tools/portal383/server-snippet.js` | 12299 | `2262ef8f3c16f6c53130b35e20da3c61784c7c58` |
| `tools/prospect364/browser-css.b64` | 2100 | `28dde103abd0a34735c2338f16733782397db8fc` |
| `tools/prospect364/browser-js.b64` | 4368 | `bff17c63dcef10ec3830845ac94168b592c4c903` |
| `tools/prospect365/browser-css.b64` | 2696 | `f061d7c64f8d6ad771fda7e9069130a49bb66e5a` |
| `tools/prospect365/browser-js.b64` | 7508 | `30d5c5051135fa429e1d8623831f534a78b38298` |
| `tools/root-url-patch.js` | 2497 | `1c56afc47a230020270c074d6fe0cc31a59f372c` |
| `tools/routing414/browser.js` | 10312 | `25dc1030112655b5a50794c815c32ddb936e7fd6` |
| `tools/seo382/admin.css` | 2232 | `958ded8dbce9fd5da461b6ccc6a6a2a8905c5194` |
| `tools/seo382/admin.js` | 21472 | `1851195c5003fcabe8e1c4659336cda8eabc71d3` |
| `tools/seo382/portal.css` | 2453 | `735bf2fa678a46a6322dfcf2bfd892454647352d` |
| `tools/seo382/portal.js` | 8528 | `4d32d3d7325b648fe6ea63a9e60c7ecc5d014e1b` |
| `tools/seo382/routes.txt` | 3659 | `63fbb85eee69a8a72a70451ce24d8afcecdcaa5e` |
| `tools/seo382/server-snippet.js` | 11690 | `82693462bd574e463039d01954f4e626796ebe8c` |
| `tools/site440/lead.test.js` | 3287 | `3f332e7da16087d2e0653162faf34226450cb608` |
| `tools/site440/routes.txt` | 171 | `7dad5e21ce01c4ce16115a201cbb0fd8233096c3` |
| `tools/site440/server-snippet.js` | 9743 | `c343d4b2669a5a6f14ead3c593b6b3de334abe29` |
| `tools/tasks391/admin.css` | 4827 | `af26a0294f2f86a0f27ed888b2907426420b49e3` |
| `tools/tasks391/admin.js` | 25097 | `172be5a434e8336d6388083b4fa97440b3d8cfa2` |
| `tools/tasks391/portal.css` | 2227 | `8e56a45f36ede60b21a5f8bb309894ed5b1df3c3` |
| `tools/tasks391/portal.js` | 7568 | `5d15fc139ea0d856ad5d3879de7e16c1c8bfe43a` |
| `tools/tasks391/routes.txt` | 4965 | `432e8bc6e133cbc9924b847dc8b2a500e39fc70c` |
| `tools/tasks391/server-snippet.js` | 20100 | `0bf023ca9ead8f899fd22552c46b6de7a3c240f0` |
| `tools/test-db.js` | 466 | `311f0f607c69eabcd29f027fd26e20b8173084fe` |
| `tools/validate-automation-40.js` | 201 | `3130e06d14a288a50b4e55a6dd3b0415aea719c0` |
| `tools/visual361/part00` | 5000 | `578807b2c2ba7d0cad4ee05781b5c5f74a2d67a0` |
| `tools/visual361/part01` | 1680 | `9595be76e48aa5debbd1dac0ab07ed86d6dfba85` |
| `tools/whatsapp415/browser.css` | 543 | `33d382984aeb45fc76a3cb7306c1c767c5704240` |
| `tools/whatsapp415/browser.js` | 5326 | `e9dbd980d572b745e87d2944f6d83dfe626e8408` |
| `tools/whatsapp420/browser.css` | 2724 | `10b6d16aee04ca5537e226be627103ae00948898` |
| `tools/whatsapp420/browser.js` | 11593 | `ce80d0796606dc9aecd34297739e5dc3b8dea542` |
| `tools/whatsapp420/cleanup.test.js` | 2271 | `f157c69f0749398e8f706e8a37a17e014dee3179` |
| `tools/whatsapp420/history.test.js` | 3908 | `74bae22f3f12ea0dac8983d0940d68afa9348f37` |
| `tools/whatsapp420/routes.txt` | 3077 | `5f87e586ffa7a6ad47468abc1d8078123a3a80c4` |
| `tools/whatsapp420/server-snippet.js` | 17096 | `405e54dd04f91bfd6153e129714b79c4dd57e4ce` |
| `tools/whatsapp430/browser.css` | 903 | `e167c1dabb1b820bc3c3d9dc16350fbbf3936666` |
| `tools/whatsapp430/browser.js` | 8007 | `5b6c9459d999137cbf587a2f0df8c444f51a47c2` |
| `tools/whatsapp430/routes.txt` | 1638 | `27e19546e00d69b02e91736d9257eb4861fd6d1c` |
| `tools/whatsapp430/server-snippet.js` | 7174 | `96ee948984e693ce417675bb717485c24782e972` |
| `tools/wp370/browser.css` | 3306 | `181e9ac304d277ce214e184137aa03fdf9dd46b9` |
| `tools/wp370/browser.js` | 28458 | `6ab90b84e07903d74737a12af3f85b221c091b7f` |
| `tools/wp370/plugin-1.1.0.zip.b64` | 10212 | `81ca767206ac6faa1fe478e7c8e73dbcdcd7c9af` |
| `tools/wp370/plugin.zip.b64` | 7252 | `93c2e3a03c74433f9e2f1ae38141a0dc907aac77` |
| `tools/wp370/routes.txt` | 5138 | `36d3b1a791e6efd87b7f3204229d9dc163a936d1` |
| `tools/wp370/server-snippet.js` | 19808 | `87f270ced2ce339d8f3ff975ea3ed13f352d6c1d` |

### web (54)

| Caminho do arquivo | Tamanho (bytes) | SHA Git do blob |
| --- | ---: | --- |
| `web/app-icon.svg` | 1150 | `63bfa1d2602e3a644c384bf6a8ee2aa40f45943e` |
| `web/billing-recurring-384.css` | 1574 | `cb165640b78d003e13462cfa1c4cc6bd8d11e876` |
| `web/billing-recurring-384.js` | 22671 | `27ff6791ac620b06da850e5a0b7f052dd1221419` |
| `web/central-commercial-366.css` | 7922 | `2d395952dbc768ca1744753062a2d37f800493f2` |
| `web/central-commercial-366.js` | 21849 | `0500b310a79ba216590a82ba531e60eab9918ad6` |
| `web/client-fix-369.css` | 2480 | `817a94bc7e1d7f2451a28d838a463d2ea0b8fa22` |
| `web/client-fix-369.js` | 22134 | `6686546209a0cef617f15079dfa6dd1b31360e31` |
| `web/client-parity-368.css` | 1754 | `0e6806218374ab4536d29fff255b414d21d7ec88` |
| `web/client-parity-368.js` | 12050 | `fd364f9d66eb8a3001a9f44293277ed57c8cff07` |
| `web/client-portal-380.css` | 1029 | `ac6129b12b11e4c106665edc7add36e1365ccc15` |
| `web/client-portal-380.js` | 11088 | `36239215fc699682db17d113b44eeaa1684088cc` |
| `web/core-health-390.css` | 2292 | `76455657d7e3eb19ebb287c4aa37926cf1a53a11` |
| `web/core-health-390.js` | 11932 | `2a9aa2ddc74364395056e1da628a41cf2c275b6e` |
| `web/downloads/exe-pro-connector-v1.0.0.zip` | 5438 | `adab780e53b6ac34c2a234185f9e8fd46534ccb7` |
| `web/downloads/exe-pro-connector-v1.1.0.zip` | 7657 | `d86b51ee751dac324b36ca95415c72e4ec3f8482` |
| `web/downloads/exe-pro-connector-v1.4.0.zip` | 31368 | `57e9dee6cccbfd71b3f5f6bbf8e41f9073ec408c` |
| `web/index.html` | 444715 | `6bbd77807f6b9ef20fa24ac771510d84b0d0dc6c` |
| `web/manifest.webmanifest` | 486 | `afb9f2686dc1b529b4c0a98669f00943218a4194` |
| `web/master-panel-363.css` | 3344 | `6bb403c49b372df95ef28042105ae9d9b4c4c735` |
| `web/master-panel-363.js` | 15655 | `ebd7a52d4497a1dcb1bcbf52dbb58c0b39806c12` |
| `web/notifications-367.css` | 1928 | `75488ac4bc10de9241d87324967685c4794d5b44` |
| `web/notifications-367.js` | 16320 | `08b7a01815c074128cd6ffdb03b0be5e423759f2` |
| `web/portal-admin-381.css` | 1680 | `247dd9f63a8f8cb4f355792dc43a213722f389a8` |
| `web/portal-admin-381.js` | 15653 | `454d03cff01dd62a735d8bf8552b323c924b1171` |
| `web/portal-billing-384.css` | 1183 | `1daead9017e524ed7dbde48185b5dd6b2889c968` |
| `web/portal-billing-384.js` | 5177 | `bcd7dd5d97140f979c813a5d3b0aa711ff8efb5d` |
| `web/portal-docs-383.css` | 2669 | `93cf535da01f445ba20ca750dde49f34a381dc29` |
| `web/portal-docs-383.js` | 10803 | `523990860091ebf79656ad6692edf44326962d1a` |
| `web/portal-docs-admin-383.css` | 1433 | `c3a20204183f217de075702140c19678140451ff` |
| `web/portal-docs-admin-383.js` | 11452 | `232fd99ab8a24dec36ee8c4db4cbb678d9e1251c` |
| `web/portal-operations-381.css` | 3692 | `b7e28159efb46b058a494ddebd2a8f65223751ee` |
| `web/portal-operations-381.js` | 15661 | `7fac2afa36682e54f9584872bdf309c1d3513b93` |
| `web/portal-tasks-391.css` | 2227 | `8e56a45f36ede60b21a5f8bb309894ed5b1df3c3` |
| `web/portal-tasks-391.js` | 7568 | `5d15fc139ea0d856ad5d3879de7e16c1c8bfe43a` |
| `web/portal.html` | 93770 | `22bb86d6d28068575a80c4187bcb11b69d1accf6` |
| `web/prospect-intelligence-365.css` | 7684 | `7e56ead537c216a0430cfbb8fc52c44fea51e1b6` |
| `web/prospect-intelligence-365.js` | 17338 | `96ff99717bf66eeef8b7683f2bc73650d0c25a2c` |
| `web/prospect-parity-364.css` | 5547 | `9cca368eca720b21696b865e6bb5a78032c1fecb` |
| `web/prospect-parity-364.js` | 9126 | `633c256c670fab5a416d4008e11906ba5fc13398` |
| `web/seo-portal-382.css` | 2453 | `735bf2fa678a46a6322dfcf2bfd892454647352d` |
| `web/seo-portal-382.js` | 8528 | `4d32d3d7325b648fe6ea63a9e60c7ecc5d014e1b` |
| `web/seo-reports-382.css` | 2232 | `958ded8dbce9fd5da461b6ccc6a6a2a8905c5194` |
| `web/seo-reports-382.js` | 21472 | `1851195c5003fcabe8e1c4659336cda8eabc71d3` |
| `web/service-worker.js` | 805 | `5f47210a3e3e90ca74d642722ebe6e00f6235ec8` |
| `web/tasks-391.css` | 4827 | `af26a0294f2f86a0f27ed888b2907426420b49e3` |
| `web/tasks-391.js` | 25097 | `172be5a434e8336d6388083b4fa97440b3d8cfa2` |
| `web/whatsapp-business-420.css` | 2724 | `10b6d16aee04ca5537e226be627103ae00948898` |
| `web/whatsapp-business-420.js` | 11593 | `ce80d0796606dc9aecd34297739e5dc3b8dea542` |
| `web/whatsapp-coexistence-430.css` | 903 | `e167c1dabb1b820bc3c3d9dc16350fbbf3936666` |
| `web/whatsapp-coexistence-430.js` | 8007 | `5b6c9459d999137cbf587a2f0df8c444f51a47c2` |
| `web/whatsapp-web-415.css` | 543 | `33d382984aeb45fc76a3cb7306c1c767c5704240` |
| `web/whatsapp-web-415.js` | 5326 | `e9dbd980d572b745e87d2944f6d83dfe626e8408` |
| `web/wordpress-control-370.css` | 3306 | `181e9ac304d277ce214e184137aa03fdf9dd46b9` |
| `web/wordpress-control-370.js` | 28458 | `6ab90b84e07903d74737a12af3f85b221c091b7f` |

## Limites da evidência

A comparação de PR/commits pode apresentar apenas até 300 alterações. **Esta lista foi derivada das duas árvores Git completas (`truncated=false`)**, conferindo por igualdade de caminho + Git blob SHA. O relatório documenta o conteúdo do repositório, **não** comprova que os mesmos arquivos estejam implantados no Shard Cloud.

**Segredos e dados:** inventário de nomes e blobs **não é auditoria exaustiva de tokens ou conteúdo dos ZIPs**. Esta etapa não executou scripts, serviços, PostgreSQL, migrações ou webhooks e não alterou a produção.

**Procedimento futuro:** revisar este inventário e a origem do snapshot, validar o código com um laboratório isolado e exigir autorização separada antes de qualquer merge/deploy.
