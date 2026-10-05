# Ideen & Backlog

Gesammelte Ideen für spätere Versionen – noch nicht umgesetzt. Erledigte Punkte wandern ins [CHANGELOG](CHANGELOG.md).

## Geplant

### Dashboard: Anzahl der Fotos anzeigen
Auf der Karte eines Ziels die Anzahl der Fotos zeigen, sofern welche vorhanden sind (z. B. Kamera-Icon + Zahl).
- Die Listen-API liefert `images` bereits mit – `destination.images.length` in `destinationCard()` (`assets/app.js`) reicht.
- Optional: erstes Foto als Vorschaubild auf der Karte.

### Dashboard: Favorit und Besucht direkt umschalten
Die Icons für Favorit und Besucht in der Übersicht anklickbar machen.
- Die Karte ist aktuell ein `<a>` – Buttons darin brauchen `preventDefault()`/`stopPropagation()`, oder die Karte wird umgebaut (Link nur auf dem Titel).
- Eigene `<button>`-Elemente mit `aria-pressed` und `title` für Barrierefreiheit.
- API: entweder `PUT destinations/<id>` mit allen Feldern oder neuer, schlanker Endpunkt (z. B. `PATCH destinations/<id>` nur für `favorite`/`visited`).
- Optimistisch umschalten, bei Fehler zurücksetzen.

### Feature: Kategorien
Eigene Kategorien anlegen (z. B. „Wandern“, „Museum“, „Mit Kindern“) und Ziele zuordnen.
- Abgrenzung zu Tags klären: Kategorie = eine feste Einordnung pro Ziel (ggf. mit Icon/Farbe), Tags = freie Schlagworte. Alternativ Tags zu Kategorien ausbauen.
- Schema nur additiv: neue Tabelle `Category` (id, name, icon/farbe, createdBy, …), Spalte `Destination.categoryId` oder Zuordnungstabelle.
- Filter nach Kategorie in Suche und Dashboard.
- Gehören Kategorien einem Benutzer? (Tags sind derzeit global und nur vom Admin änderbar.)

### Feature: Freigabe von Zielen und Kategorien zwischen Benutzern
Ziele (einzeln oder eine ganze Kategorie) mit anderen Benutzern teilen.
- Neue Tabelle z. B. `Share` (resourceType, resourceId, ownerId, sharedWithId, permission `READ`/`WRITE`, createdAt).
- Alle Abfragen mit `createdBy = ?` (api.php, u. a. Ziele, Bilder) um freigegebene Ziele erweitern; Schreib-/Löschrechte gesondert prüfen.
- Persönliche Felder (`privateNotes`, ggf. Favorit/Besucht) pro Benutzer trennen – sonst sieht/ändert der andere sie mit.
- UI: Freigabe-Dialog auf der Detailseite, Kennzeichnung „geteilt von …“ im Dashboard, Liste „Mit mir geteilt“.

## Weitere Ideen

- **Kartenansicht**: `latitude`/`longitude` existieren im Schema, werden aber nicht genutzt. Koordinaten erfassen (Browser-Geolocation „Aktueller Standort“) und Ziele auf einer Karte zeigen – ohne externe Bibliothek z. B. als Link zu OpenStreetMap; eine eingebettete Karte bräuchte eine Bibliothek (Abwägung wegen „keine Abhängigkeiten“).
- **Papierkorb**: Ziele werden per `deletedAt` nur weich gelöscht – Ansicht zum Wiederherstellen bzw. endgültigen Löschen.
- **Sortierung im Dashboard**: nach Name, Bewertung, zuletzt geändert, noch nicht besucht.
- **Besuchsdatum / Notizen pro Besuch**: statt nur „besucht ja/nein“ ein Datum oder eine kleine Besuchshistorie.
- **Offline-Fähigkeit**: Service Worker für die PWA (App-Shell cachen, Liste zuletzt geladener Ziele offline anzeigen).
- **Export/Import**: Ziele als JSON/CSV oder GPX exportieren – auch als Backup pro Benutzer.
- **Bilder verkleinern**: beim Upload serverseitig (GD, falls verfügbar) oder clientseitig per Canvas skalieren, um Speicher und Ladezeit zu sparen.
- **Paginierung**: Die Zielliste lädt derzeit alles auf einmal – bei vielen Zielen seitenweise laden.
- **Zufallsziel**: Button „Wohin heute?“, der ein (unbesuchtes) Ziel vorschlägt, ggf. mit aktuellen Filtern.
