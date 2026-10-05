# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/).
Solange die Version unter 1.0.0 liegt, können sich Datenmodell und API jederzeit ändern.

## [Unveröffentlicht]

### Hinzugefügt
- Suche: Filter nach Mindestbewertung (API-Parameter `minRating`).
- Suche: Mehrere Tags gleichzeitig auswählbar; angezeigt werden Ziele, die alle ausgewählten Tags haben
  (API-Parameter `tag[]`, mehrfach angebbar; `tag=<name>` funktioniert weiterhin).
- Hinweistext unter dem Link-Feld mit Beispielen.

### Geändert
- Das Feld „Google Maps Link“ heißt jetzt „Link“ und ist für beliebige Webadressen gedacht
  (z. B. OpenStreetMap, Komoot oder die Webseite des Ziels). Der Button auf der Detailseite heißt
  „Link öffnen“ und zeigt die Ziel-Domain. Feldname in API und Datenbank bleibt `googleMapsLink`.
- Die Suchfilter stehen ab mittlerer Bildschirmbreite nebeneinander.

## [0.0.1] – 2026-10-05

Erste versionierte Veröffentlichung. Die App läuft jetzt ohne npm, Framework und Build-Schritt auf jedem Webserver mit PHP 8.1+.

### Geändert
- Frontend von Next.js/React auf reines HTML, CSS und JavaScript umgestellt (Single-Page-App mit Hash-Routing).
- Backend von Next.js-API-Routes auf `api.php` mit PDO SQLite umgestellt; Endpunkte liegen jetzt unter `api.php?r=<pfad>`.
- Anmeldung über PHP-Sessions statt JWT-Cookie.
- Daten (Datenbank, Sessions, Bilder) liegen gesammelt in `data/`; der Ort ist über `AUSFLUGSZIELE_DATA_DIR` einstellbar.
- Destinations-Antworten liefern Tags als `[{ id, name }]` und Bilder mit `url` statt verschachtelter Prisma-Strukturen.
- Tags umbenennen und löschen ist nur noch für Administratoren erlaubt.
- Die Suche findet Umlaute unabhängig von Groß-/Kleinschreibung.

### Hinzugefügt
- Ersteinrichtung im Browser: Gibt es noch keine Benutzer, wird der erste Admin-Zugang angelegt.
- Oberfläche für Suche und Filter (Text, Favorit, Besucht, Tag).
- Bilder auf der Detailseite anzeigen, hochladen und löschen.
- Ziele löschen, Tags direkt im Formular anlegen, Tag-Verwaltung im Profil.
- Passwort ändern und Abmelden im Profil.
- Benutzerverwaltung für Administratoren.
- Kommandozeilen-Skript `server/cli.php` (Benutzer anlegen, Passwort zurücksetzen, Demo-Daten).
- `.htaccess`-Dateien mit Zugriffsschutz und Sicherheits-Headern für Apache.
- `.user.ini` bzw. `.htaccess`-PHP-Einstellungen: Fehler werden protokolliert statt ausgegeben, Uploads bis 10 MB.
- Verständliche Fehlermeldung, wenn ein Upload die `post_max_size` des Servers überschreitet.
- `CONTRIBUTING.md`, `CHANGELOG.md`, `.editorconfig` und `.gitattributes`.

### Entfernt
- Next.js, React, Prisma, Tailwind und alle weiteren npm-Abhängigkeiten.
- Docker-Setup und PostgreSQL-Konfiguration.
- Feste Standard-Zugangsdaten aus dem Seed; `seed-demo` erzeugt zufällige Passwörter.

### Sicherheit
- Bilder werden nicht mehr öffentlich unter `public/uploads` abgelegt, sondern nur an den Eigentümer des Ziels ausgeliefert.
- Bilder können nur noch zu eigenen Zielen hochgeladen werden.
- Uploads werden auf echte Bilddateien (JPEG, PNG, GIF, WebP, max. 10 MB) geprüft und unter zufälligem Namen gespeichert.
- Google-Maps-Links müssen mit `http://` oder `https://` beginnen (verhindert `javascript:`-Links).
- Schreibende API-Anfragen erfordern den Header `X-Requested-With: fetch` (CSRF-Schutz).
- Das Login-Rate-Limit nutzt die echte Client-Adresse statt des fälschbaren `X-Forwarded-For`-Headers und gilt auch bei mehreren PHP-Prozessen.

### Umstieg von der früheren Next.js-Fassung
- Eine bestehende SQLite-Datenbank (`dev.db`) kann als `data/app.db` weiterverwendet werden; Passwörter bleiben gültig.
- Bisher hochgeladene Bilder aus `public/uploads/` nach `data/uploads/` verschieben.
- PostgreSQL-Datenbanken werden nicht mehr unterstützt.

## Vor 0.0.1

Ursprüngliche, nicht versionierte Fassung als Next.js-PWA mit Prisma, Login, Ausflugszielen, Tags und
Bild-Upload-API (Commit [`96d0982`](https://github.com/listiges-kaenguru/ausflugsziele/commit/96d0982)).

[0.0.1]: https://github.com/listiges-kaenguru/ausflugsziele/releases/tag/v0.0.1
