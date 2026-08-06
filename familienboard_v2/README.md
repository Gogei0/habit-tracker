# Mach Ma! – Familienpinnwand

Responsive Familien-App für gemeinsame Haushaltsaufgaben und Projekte im Pinnwand- und Papierdesign.

## Zugang der Testfamilie

- Familiencode: `MACHMA-SOMMER-7K4P`
- Die PIN wird ausschließlich als Hash in Supabase gespeichert.
- Nach erfolgreicher Anmeldung merkt sich der jeweilige Browser eine zufällige Sitzung für 180 Tage.
- Weder PIN noch Sitzungszugang sind in `supabase-config.js` hinterlegt.

## Supabase verbinden

1. Ein neues Supabase-Projekt anlegen.
2. Im SQL Editor `supabase-setup.sql` vollständig ausführen.
3. Unter **Project Settings → API** die Project URL und den öffentlichen Publishable-/`anon`-Key kopieren.
4. Beide Werte in `supabase-config.js` eintragen.
5. Die aktualisierte Datei erneut über GitHub Pages veröffentlichen.

Der `service_role`-Schlüssel gehört niemals in die Website.

## Speicherung

Ohne Supabase-Konfiguration bleibt die öffentliche App gesperrt. Nach der Verbindung werden Aufgaben, Projekte, Mitglieder und der selbst gewählte Familienname gemeinsam in Supabase gespeichert.
