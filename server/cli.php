<?php
// Wartung über die Kommandozeile, z. B. wenn das Admin-Passwort vergessen wurde.
//   php server/cli.php create-user <benutzername> <passwort> [ADMIN|USER]
//   php server/cli.php set-password <benutzername> <passwort>
//   php server/cli.php list-users
//   php server/cli.php seed-demo        (nur für die lokale Entwicklung, gibt zufällige Passwörter aus)

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/bootstrap.php';

$command = $argv[1] ?? '';

switch ($command) {
    case 'create-user':
        [$username, $password] = [$argv[2] ?? '', $argv[3] ?? ''];
        $role = strtoupper($argv[4] ?? 'USER') === 'ADMIN' ? 'ADMIN' : 'USER';
        if (strlen($username) < 3 || strlen($password) < 6) {
            exit("Benutzername mindestens 3, Passwort mindestens 6 Zeichen.\n");
        }
        $timestamp = now();
        db()->prepare('INSERT INTO "User" (id, username, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([uuid(), $username, hash_password($password), $role, $timestamp, $timestamp]);
        echo "Benutzer $username ($role) angelegt.\n";
        break;

    case 'set-password':
        [$username, $password] = [$argv[2] ?? '', $argv[3] ?? ''];
        if (strlen($password) < 6) {
            exit("Passwort mindestens 6 Zeichen.\n");
        }
        $stmt = db()->prepare('UPDATE "User" SET passwordHash = ?, updatedAt = ? WHERE username = ?');
        $stmt->execute([hash_password($password), now(), $username]);
        echo $stmt->rowCount() ? "Passwort für $username geändert.\n" : "Benutzer $username nicht gefunden.\n";
        break;

    case 'list-users':
        foreach (db()->query('SELECT username, role, createdAt FROM "User" ORDER BY username') as $user) {
            echo "{$user['username']}\t{$user['role']}\t{$user['createdAt']}\n";
        }
        break;

    case 'seed-demo':
        seed_demo();
        echo "Demo-Daten angelegt.\n";
        break;

    default:
        echo "Befehle: create-user, set-password, list-users, seed-demo\n";
        exit(1);
}

function seed_demo(): void
{
    $timestamp = now();
    $userIds = [];
    foreach (['admin' => 'ADMIN', 'demo' => 'USER'] as $username => $role) {
        $stmt = db()->prepare('SELECT id FROM "User" WHERE username = ?');
        $stmt->execute([$username]);
        $userIds[$username] = $stmt->fetchColumn() ?: null;
        if ($userIds[$username] === null) {
            // Keine festen Zugangsdaten im Code: Passwort zufällig erzeugen und einmalig anzeigen.
            $password = bin2hex(random_bytes(6));
            echo "Benutzer $username ($role) angelegt, Passwort: $password\n";
            $userIds[$username] = uuid();
            db()->prepare('INSERT INTO "User" (id, username, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
                ->execute([$userIds[$username], $username, hash_password($password), $role, $timestamp, $timestamp]);
        }
    }

    foreach (['Natur', 'Kultur', 'Food', 'Familie', 'Weekend'] as $name) {
        db()->prepare('INSERT OR IGNORE INTO "Tag" (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)')
            ->execute([uuid(), $name, $timestamp, $timestamp]);
    }

    $stmt = db()->prepare('SELECT 1 FROM "Destination" WHERE name = ? AND createdBy = ?');
    $stmt->execute(['Bergwanderung', $userIds['demo']]);
    if (!$stmt->fetchColumn()) {
        $id = uuid();
        db()->prepare('INSERT INTO "Destination" (id, name, address, description, rating, favorite, visited, createdAt, updatedAt, createdBy) VALUES (?, ?, ?, ?, 5, 1, 0, ?, ?, ?)')
            ->execute([$id, 'Bergwanderung', 'Bergstraße 12, 8000 Zürich', 'Schöner Tagesausflug mit Aussichtspunkt.', $timestamp, $timestamp, $userIds['demo']]);
        db()->prepare('INSERT INTO "DestinationTag" (destinationId, tagId) SELECT ?, id FROM "Tag" WHERE name IN (?, ?)')
            ->execute([$id, 'Natur', 'Weekend']);
    }
}
