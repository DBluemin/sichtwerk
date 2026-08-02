#!/bin/zsh
# NENNWERT SEO-Cockpit — per Doppelklick starten.
# Startet den lokalen Server (Port 8899) und öffnet das Dashboard im Browser.
cd "$(dirname "$0")"

# Läuft schon einer? Dann nur den Browser öffnen.
if curl -s -o /dev/null --max-time 1 http://localhost:8899/dashboard.html; then
  echo "Cockpit läuft bereits — öffne Browser …"
  open "http://localhost:8899/dashboard.html"
  exit 0
fi

echo "Starte NENNWERT SEO-Cockpit auf http://localhost:8899 …"
( sleep 1.2 && open "http://localhost:8899/dashboard.html" ) &
exec node server.js
