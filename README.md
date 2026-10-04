# Ausflugsziele

Progressive Web App zur Verwaltung persönlicher Ausflugsziele.

> [!WARNING]
> **Dieses Projekt befindet sich noch in der Entwicklung.**
> Funktionen, Datenmodell und API können sich jederzeit ohne Vorankündigung ändern.
> Die Anwendung ist derzeit **nicht für den produktiven Einsatz** gedacht.

## Bekannte Baustellen
- Die Datenbankanbindung ist noch uneinheitlich: Das Prisma-Schema nutzt aktuell SQLite (`better-sqlite3`),
  `.env.example` und `docker-compose.yml` sind dagegen auf PostgreSQL ausgelegt.
- Die Seed-Daten enthalten Standard-Zugangsdaten (siehe unten) und `AUTH_SECRET` ist in den Beispielkonfigurationen
  nur ein Platzhalter. Beides vor jedem öffentlich erreichbaren Betrieb ändern.

## Voraussetzungen
- Node.js 20+
- npm 10+
- Docker und Docker Compose (optional)
- PostgreSQL 16+ (nur für die PostgreSQL-Variante)

## Installation
1. `cp .env.example .env`
2. Passe die Datenbankverbindung an und setze ein eigenes `AUTH_SECRET`.
3. `npm install`
4. `npx prisma migrate dev --name init`
5. `npx tsx scripts/seed.ts`
6. `npm run dev`

## Entwicklung
- `npm run dev`
- `npm run lint`
- `npm run build`

## Docker
- `docker compose up --build`

## Seed-Daten
Nur für die lokale Entwicklung:
- Admin: `admin / admin123`
- Demo-Benutzer: `demo / demo123`

## Backup & Restore
- Backup: `docker compose exec postgres pg_dump -U postgres ausflugsziele > backup.sql`
- Restore: `docker compose exec -T postgres psql -U postgres ausflugsziele < backup.sql`

## Projektstruktur
- app/: App Router-Seiten und API-Routes
- components/: wiederverwendbare UI-Komponenten
- lib/: Hilfsfunktionen, Auth, Validation und Security
- prisma/: Prisma-Schema und Migrationen
- scripts/: Seed-Skripte und Wartungsaufgaben
- public/: statische Assets und PWA-Icons

## Lizenz
Copyright (C) 2026 listiges-kaenguru

Dieses Programm ist freie Software: Sie können es unter den Bedingungen der
GNU General Public License, wie von der Free Software Foundation veröffentlicht,
weitergeben und/oder modifizieren, entweder gemäß Version 3 der Lizenz oder
(nach Ihrer Wahl) jeder späteren Version.

Dieses Programm wird in der Hoffnung bereitgestellt, dass es nützlich ist,
jedoch OHNE JEDE GEWÄHRLEISTUNG. Details finden Sie in der Datei [LICENSE](LICENSE).
