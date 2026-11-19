wt = r"D:\PROJETOS VIBE CODING\wt-stale-pt409"
for f in ["tests/invariants/service-event-origin.test.ts", "tests/unit/followup-stale-nao-e-retry.test.ts", "tests/invariants/fronteira-progressao-nao-e-conflito.test.ts", "tests/unit/agenda-meet-routes.test.ts", "tests/unit/crm-b2b-gestao-empresas.test.ts", "tests/unit/agenda-google-selection-routes.test.ts"]:
    p = f"{wt}\\{f}"
    with open(p, "r", encoding="utf-8", errors="ignore") as fh:
        txt = fh.read()
    print(f"{f.split('/')[-1]}: 40001={txt.count('40001')}, PT409={txt.count('PT409')}")
