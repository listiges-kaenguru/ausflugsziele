# Ausflugsziele

Progressive Web App zur Verwaltung persönlicher Ausflugsziele.

> [!WARNING]
> **Dieses Projekt befindet sich noch in der Entwicklung.**
> Funktionen, Datenmodell und API können sich jederzeit ohne Vorankündigung ändern.

Die App kommt ohne npm, Composer, Build-Schritt und externe Bibliotheken aus:
das Frontend ist reines HTML/CSS/JavaScript, das Backend reines PHP mit SQLite.

## Voraussetzungen
- Webserver mit PHP **8.1 oder neuer** (z. B. Apache, nginx + PHP-FPM, oder gewöhnliches Webhosting)
- PHP-Erweiterung `pdo_sqlite` (bei fast allen Hostern standardmäßig aktiv)
- Schreibrechte für PHP im Ordner `data/`

## Installation
1. Alle Dateien in ein Verzeichnis des Webservers kopieren (auch ein Unterordner funktioniert).
2. Sicherstellen, dass PHP in `data/` schreiben darf.
3. Die Seite im Browser öffnen. Beim ersten Aufruf wird die Datenbank angelegt und
   du richtest den ersten Zugang ein – er erhält Administratorrechte.
4. Weitere Benutzer legt ein Admin unter **Profil → Benutzer** an.

Für den Betrieb im Internet unbedingt HTTPS verwenden.

### Apache
Die mitgelieferten `.htaccess`-Dateien sperren `server/` und `data/` und setzen Sicherheits-Header.
Dafür muss `AllowOverride All` (mindestens `AuthConfig FileInfo Indexes Options`) erlaubt sein.

### nginx
nginx liest keine `.htaccess`-Dateien. Die internen Ordner müssen selbst gesperrt werden:

```nginx
location ~ ^/(data|server)/ { deny all; }
location ~ /\.             { deny all; }
location ~ \.(db|md)$      { deny all; }
location = /api.php {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root/api.php;
    fastcgi_pass unix:/run/php-fpm/www.sock;
}
```

### Datenverzeichnis außerhalb des Webroots (empfohlen, falls möglich)
Über die Umgebungsvariable `AUSFLUGSZIELE_DATA_DIR` kann ein anderer Speicherort gesetzt werden,
z. B. in Apache mit `SetEnv AUSFLUGSZIELE_DATA_DIR /var/lib/ausflugsziele`.

## Lokale Entwicklung
PHP bringt einen eingebauten Entwicklungsserver mit:

```sh
php -S localhost:8000
```

Danach http://localhost:8000 öffnen. Achtung: Der eingebaute Server beachtet keine `.htaccess`-Dateien –
nur für die Entwicklung verwenden.

Optional Demo-Daten anlegen (Admin `admin / admin123`, Benutzer `demo / demo123`):

```sh
php server/cli.php seed-demo
```

## Wartung über die Kommandozeile
```sh
php server/cli.php list-users
php server/cli.php create-user <name> <passwort> [ADMIN|USER]
php server/cli.php set-password <name> <passwort>
```

## Backup & Restore
Alle Daten liegen in `data/`:
- `data/app.db` – SQLite-Datenbank
- `data/uploads/` – hochgeladene Bilder

Für ein Backup genügt es, diesen Ordner zu kopieren (am besten, während niemand die App benutzt).
Zum Wiederherstellen den Ordner zurückkopieren.

Eine SQLite-Datenbank der früheren Node.js-Version (`dev.db`) kann direkt als `data/app.db`
weiterverwendet werden; bestehende Passwörter bleiben gültig.

## API
Alle Endpunkte liegen unter `api.php?r=<pfad>` und antworten mit
`{ "success": true, "data": … }` bzw. `{ "success": false, "error": { "code", "message" } }`.
Schreibende Anfragen benötigen den Header `X-Requested-With: fetch`.

| Methode | Pfad | Beschreibung |
| --- | --- | --- |
| GET | `me` | Angemeldeter Benutzer und ob die Ersteinrichtung aussteht |
| POST | `setup` | Ersten Admin anlegen (nur solange es keine Benutzer gibt) |
| POST | `login`, `logout`, `change-password` | Anmeldung und Passwort |
| GET/POST | `destinations` | Ziele auflisten (Filter: `search`, `favorite`, `visited`, `tag`) / anlegen |
| GET/PUT/DELETE | `destinations/<id>` | Ziel lesen / ändern / löschen |
| GET/POST | `tags` | Tags auflisten / anlegen |
| PUT/DELETE | `tags/<id>` | Tag umbenennen / löschen (nur Admin) |
| POST | `images` | Bild hochladen (`multipart/form-data`: `destinationId`, `file`) |
| GET | `images/<id>/file` | Bild abrufen |
| DELETE | `images/<id>` | Bild löschen |
| GET/POST | `users` | Benutzer auflisten / anlegen (nur Admin) |

## Projektstruktur
- `index.html`, `assets/` – Frontend (Single-Page-App mit Hash-Routing)
- `api.php` – JSON-API
- `server/` – PHP-Hilfsfunktionen, Validierung und Kommandozeilen-Skript
- `data/` – Datenbank, Sessions und Uploads (wird automatisch angelegt, nicht öffentlich)

## Lizenz
Copyright (C) 2026 listiges-kaenguru

Dieses Programm ist freie Software: Sie können es unter den Bedingungen der
GNU General Public License, wie von der Free Software Foundation veröffentlicht,
weitergeben und/oder modifizieren, entweder gemäß Version 3 der Lizenz oder
(nach Ihrer Wahl) jeder späteren Version.

Dieses Programm wird in der Hoffnung bereitgestellt, dass es nützlich ist,
jedoch OHNE JEDE GEWÄHRLEISTUNG. Details finden Sie in der Datei [LICENSE](LICENSE).

Icons: [Lucide](https://lucide.dev) (ISC-Lizenz).
