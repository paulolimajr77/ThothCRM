with open(r"D:\PROJETOS VIBE CODING\wt-stale-pt409\supabase\migrations\20261013120000_0700_recusa_permanente_stale_vira_pt409.sql", "r", encoding="utf-8") as f:
    content = f.read()
if "-- manifest:" in content:
    print("MANIFEST OK")
else:
    lines = content.splitlines()
    lines.insert(0, "-- manifest: recusas permanentes (service_stale, google_stale, appointment_stale, meet_stale, reply_stale, etc) saem como PT409 em vez de 40001, medido VPS srv1379625 (2026-10-12).")
    with open(r"D:\PROJETOS VIBE CODING\wt-stale-pt409\supabase\migrations\20261013120000_0700_recusa_permanente_stale_vira_pt409.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("MANIFEST ADDED AT TOP")
