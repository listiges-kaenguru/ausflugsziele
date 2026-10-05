# Hinweise für Coding-Agents

Die App läuft bewusst **ohne Abhängigkeiten und ohne Build-Schritt** auf einem einfachen Webserver mit PHP:

- Kein npm, Composer, Framework oder Bundler einführen. Nur PHP-Bordmittel (PHP 8.1+, PDO SQLite) und Browser-APIs verwenden.
- Frontend: `index.html`, `assets/app.js` (Vanilla JS, Hash-Routing), `assets/app.css`. Benutzereingaben nie per `innerHTML` einfügen – immer `h()` verwenden.
- Backend: `api.php` (Router + Endpunkte), `server/` (Bootstrap, Validierung, CLI). Das DB-Schema muss mit bestehenden Datenbanken kompatibel bleiben (Änderungen nur additiv in `migrate()`).
- Lokal testen: `php -S localhost:8000`.
