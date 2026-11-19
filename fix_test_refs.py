import os, re
wt = r"D:\PROJETOS VIBE CODING\wt-stale-pt409"
files = [
    "tests/invariants/service-event-origin.test.ts",
    "tests/unit/followup-stale-nao-e-retry.test.ts",
    "tests/invariants/fronteira-progressao-nao-e-conflito.test.ts",
    "tests/unit/agenda-meet-routes.test.ts",
    "tests/unit/crm-b2b-gestao-empresas.test.ts",
    # adicionais que aparecem no scan mas podem ser transientes — só os que têm apenas 40001
    "tests/unit/agenda-google-selection-routes.test.ts",
]
count = 0
for f in files:
    p = os.path.join(wt, f)
    if not os.path.exists(p):
        print(f"SKIP {f} (nao existe)")
        continue
    with open(p, "r", encoding="utf-8", errors="ignore") as fh:
        txt = fh.read()
    # Só substitui se ainda não tem PT409 (evita duplo)
    if "PT409" not in txt and "40001" in txt:
        newtxt = txt.replace("40001", "PT409")
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(newtxt)
        n = newtxt.count("PT409") - txt.count("PT409")
        count += n
        print(f"UPDATED {f}: +{n} PT409")
    else:
        print(f"SKIP {f}: ja tem PT409 ou sem 40001")
print(f"Total substituido: {count}")
