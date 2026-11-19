import os
wt = r"D:\PROJETOS VIBE CODING\wt-stale-pt409"
print("HEAD:", open(os.path.join(wt,".git/HEAD")).read().strip().replace("ref: refs/heads/","") if False else "")
with open(os.path.join(wt,".git/HEAD"),"r") as f: ref=f.read().strip()
print("REF:", ref)
# .changes
changes = [f for f in os.listdir(os.path.join(wt,".changes")) if "pt409" in f or "2805" in f]
print("CHANGES:", changes)
# migrations
migrations = os.listdir(os.path.join(wt,"supabase/migrations"))
print("MIGRATION 0654:", any("0654" in f for f in migrations))
print("MIGRATION 0700:", any("0700" in f for f in migrations))
# origem
with open(os.path.join(wt,"lib/atendimento/origem.ts"),"r",encoding="utf-8",errors="ignore") as f:
    t=f.read()
print("ORIGEM: PT409=", t.count("PT409"), "40001=", t.count("40001"))
