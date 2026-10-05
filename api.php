<?php
// JSON-API der App. Aufruf: api.php?r=<ressource>[/<id>[/<aktion>]]

declare(strict_types=1);

// PHP-Warnungen gehören ins Fehlerprotokoll, nicht in die JSON-Antwort.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

require __DIR__ . '/server/bootstrap.php';
require __DIR__ . '/server/validation.php';

security_headers();

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $segments = array_values(array_filter(explode('/', (string) ($_GET['r'] ?? '')), 'strlen'));
    $resource = $segments[0] ?? '';
    $id = $segments[1] ?? null;
    $action = $segments[2] ?? null;

    // Schreibende Anfragen müssen per fetch() aus der App kommen (Schutz gegen CSRF).
    if ($method !== 'GET' && ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'fetch') {
        fail(403, 'FORBIDDEN', 'Ungültige Anfrage');
    }

    start_session();

    match (true) {
        $resource === 'me' && $method === 'GET' => me(),
        $resource === 'setup' && $method === 'POST' => setup(),
        $resource === 'login' && $method === 'POST' => login(),
        $resource === 'logout' && $method === 'POST' => logout(),
        $resource === 'change-password' && $method === 'POST' => change_password(),

        $resource === 'destinations' && $id === null && $method === 'GET' => list_destinations(),
        $resource === 'destinations' && $id === null && $method === 'POST' => create_destination(),
        $resource === 'destinations' && $id !== null && $method === 'GET' => respond(load_destination(own_destination($id))),
        $resource === 'destinations' && $id !== null && $method === 'PUT' => update_destination($id),
        $resource === 'destinations' && $id !== null && $method === 'DELETE' => delete_destination($id),

        $resource === 'tags' && $id === null && $method === 'GET' => list_tags(),
        $resource === 'tags' && $id === null && $method === 'POST' => create_tag(),
        $resource === 'tags' && $id !== null && $method === 'PUT' => update_tag($id),
        $resource === 'tags' && $id !== null && $method === 'DELETE' => delete_tag($id),

        $resource === 'images' && $id === null && $method === 'POST' => upload_image(),
        $resource === 'images' && $id !== null && $action === 'file' && $method === 'GET' => send_image($id),
        $resource === 'images' && $id !== null && $action === null && $method === 'DELETE' => delete_image($id),

        $resource === 'users' && $id === null && $method === 'GET' => list_users(),
        $resource === 'users' && $id === null && $method === 'POST' => create_user(),

        default => fail(404, 'NOT_FOUND', 'Unbekannter Endpunkt'),
    };
} catch (ApiException $error) {
    respond_error($error);
} catch (Throwable $error) {
    error_log('Ausflugsziele API: ' . $error);
    respond_error(new ApiException(500, 'INTERNAL_ERROR', 'Interner Fehler'));
}

// ---------------------------------------------------------------- Auth

function current_user(): ?array
{
    $userId = $_SESSION['userId'] ?? null;
    if (!is_string($userId)) {
        return null;
    }
    $stmt = db()->prepare('SELECT id, username, role, createdAt FROM "User" WHERE id = ?');
    $stmt->execute([$userId]);
    return $stmt->fetch() ?: null;
}

function require_user(): array
{
    return current_user() ?? fail(401, 'UNAUTHORIZED', 'Nicht angemeldet');
}

function require_admin(): array
{
    $user = require_user();
    if ($user['role'] !== 'ADMIN') {
        fail(403, 'FORBIDDEN', 'Nur für Administratoren');
    }
    return $user;
}

function needs_setup(): bool
{
    return (int) db()->query('SELECT COUNT(*) FROM "User"')->fetchColumn() === 0;
}

function sign_in(array $user): void
{
    session_regenerate_id(true);
    $_SESSION['userId'] = $user['id'];
}

function me(): never
{
    respond(['user' => current_user(), 'needsSetup' => needs_setup(), 'version' => APP_VERSION]);
}

// Legt beim ersten Aufruf den Admin-Zugang an (ersetzt die festen Seed-Zugangsdaten).
function setup(): never
{
    $input = validate_credentials(json_body());
    db()->beginTransaction();
    if (!needs_setup()) {
        db()->rollBack();
        fail(403, 'FORBIDDEN', 'Die Einrichtung ist bereits abgeschlossen');
    }
    $user = insert_user($input['username'], $input['password'], 'ADMIN');
    db()->commit();
    sign_in($user);
    respond(['user' => $user], 201);
}

function login(): never
{
    $key = 'login:' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    if (is_rate_limited($key)) {
        fail(429, 'RATE_LIMITED', 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.');
    }

    $input = validate_credentials(json_body());
    $stmt = db()->prepare('SELECT * FROM "User" WHERE username = ?');
    $stmt->execute([$input['username']]);
    $user = $stmt->fetch();

    if (!$user || !verify_password($input['password'], $user['passwordHash'])) {
        fail(401, 'INVALID_CREDENTIALS', 'Benutzername oder Passwort ist falsch');
    }

    sign_in($user);
    respond(['user' => ['id' => $user['id'], 'username' => $user['username'], 'role' => $user['role']]]);
}

function is_rate_limited(string $key, int $limit = 5, int $windowSeconds = 60): bool
{
    $now = time();
    $stmt = db()->prepare('SELECT count, resetAt FROM "LoginAttempt" WHERE key = ?');
    $stmt->execute([$key]);
    $entry = $stmt->fetch();

    if (!$entry || $entry['resetAt'] <= $now) {
        db()->prepare('INSERT OR REPLACE INTO "LoginAttempt" (key, count, resetAt) VALUES (?, 1, ?)')
            ->execute([$key, $now + $windowSeconds]);
        db()->prepare('DELETE FROM "LoginAttempt" WHERE resetAt <= ?')->execute([$now]);
        return false;
    }
    if ($entry['count'] >= $limit) {
        return true;
    }
    db()->prepare('UPDATE "LoginAttempt" SET count = count + 1 WHERE key = ?')->execute([$key]);
    return false;
}

function logout(): never
{
    $_SESSION = [];
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => 1,
        'path' => $params['path'],
        'secure' => $params['secure'],
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_destroy();
    respond(['ok' => true]);
}

function change_password(): never
{
    $user = require_user();
    $input = validate_change_password(json_body());

    $stmt = db()->prepare('SELECT passwordHash FROM "User" WHERE id = ?');
    $stmt->execute([$user['id']]);
    if (!verify_password($input['currentPassword'], (string) $stmt->fetchColumn())) {
        fail(401, 'INVALID_CREDENTIALS', 'Aktuelles Passwort ist falsch');
    }

    db()->prepare('UPDATE "User" SET passwordHash = ?, updatedAt = ? WHERE id = ?')
        ->execute([hash_password($input['newPassword']), now(), $user['id']]);
    respond(['ok' => true]);
}

// ---------------------------------------------------------------- Benutzer

function insert_user(string $username, string $password, string $role): array
{
    $exists = db()->prepare('SELECT 1 FROM "User" WHERE username = ?');
    $exists->execute([$username]);
    if ($exists->fetchColumn()) {
        fail(409, 'CONFLICT', 'Benutzername ist bereits vergeben');
    }
    $user = ['id' => uuid(), 'username' => $username, 'role' => $role, 'createdAt' => now()];
    db()->prepare('INSERT INTO "User" (id, username, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$user['id'], $username, hash_password($password), $role, $user['createdAt'], $user['createdAt']]);
    return $user;
}

function list_users(): never
{
    require_admin();
    respond(db()->query('SELECT id, username, role, createdAt FROM "User" ORDER BY username')->fetchAll());
}

function create_user(): never
{
    require_admin();
    $body = json_body();
    $input = validate_credentials($body);
    $role = ($body['role'] ?? 'USER') === 'ADMIN' ? 'ADMIN' : 'USER';
    respond(insert_user($input['username'], $input['password'], $role), 201);
}

// ---------------------------------------------------------------- Ziele

function own_destination(string $id): array
{
    $user = require_user();
    $stmt = db()->prepare('SELECT * FROM "Destination" WHERE id = ? AND createdBy = ? AND deletedAt IS NULL');
    $stmt->execute([$id, $user['id']]);
    return $stmt->fetch() ?: fail(404, 'NOT_FOUND', 'Ziel nicht gefunden');
}

/** Ergänzt Tags und Bilder und wandelt SQLite-Werte in passende JSON-Typen. */
function load_destination(array $row): array
{
    return load_destinations([$row])[0];
}

function load_destinations(array $rows): array
{
    if (!$rows) {
        return [];
    }
    $ids = array_column($rows, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    $tags = [];
    $stmt = db()->prepare("SELECT dt.destinationId, t.id, t.name FROM \"DestinationTag\" dt JOIN \"Tag\" t ON t.id = dt.tagId WHERE dt.destinationId IN ($placeholders) ORDER BY t.name");
    $stmt->execute($ids);
    foreach ($stmt as $tag) {
        $tags[$tag['destinationId']][] = ['id' => $tag['id'], 'name' => $tag['name']];
    }

    $images = [];
    $stmt = db()->prepare("SELECT id, destinationId, mimeType, filesize, createdAt FROM \"DestinationImage\" WHERE destinationId IN ($placeholders) ORDER BY createdAt");
    $stmt->execute($ids);
    foreach ($stmt as $image) {
        $image['filesize'] = (int) $image['filesize'];
        $image['url'] = 'api.php?r=images/' . rawurlencode($image['id']) . '/file';
        $images[$image['destinationId']][] = $image;
    }

    return array_map(fn (array $row) => [
        'id' => $row['id'],
        'name' => $row['name'],
        'address' => $row['address'],
        'latitude' => $row['latitude'] === null ? null : (float) $row['latitude'],
        'longitude' => $row['longitude'] === null ? null : (float) $row['longitude'],
        'googleMapsLink' => $row['googleMapsLink'],
        'description' => $row['description'],
        'rating' => $row['rating'] === null ? null : (int) $row['rating'],
        'favorite' => (bool) $row['favorite'],
        'visited' => (bool) $row['visited'],
        'privateNotes' => $row['privateNotes'],
        'createdAt' => $row['createdAt'],
        'updatedAt' => $row['updatedAt'],
        'tags' => $tags[$row['id']] ?? [],
        'images' => $images[$row['id']] ?? [],
    ], $rows);
}

function list_destinations(): never
{
    $user = require_user();
    $sql = 'SELECT * FROM "Destination" WHERE createdBy = ? AND deletedAt IS NULL';
    $params = [$user['id']];

    foreach (['favorite', 'visited'] as $flag) {
        $value = $_GET[$flag] ?? null;
        if ($value === 'true' || $value === 'false') {
            $sql .= " AND $flag = ?";
            $params[] = $value === 'true' ? 1 : 0;
        }
    }

    $stmt = db()->prepare($sql . ' ORDER BY createdAt DESC');
    $stmt->execute($params);
    $destinations = load_destinations($stmt->fetchAll());

    // Textsuche in PHP statt per SQL-LIKE, damit auch Umlaute unabhängig von Groß-/Kleinschreibung gefunden werden.
    $search = lower(trim((string) ($_GET['search'] ?? '')));
    if ($search !== '') {
        $destinations = array_filter($destinations, function (array $destination) use ($search) {
            foreach (['name', 'address', 'description'] as $field) {
                if ($destination[$field] !== null && str_contains(lower($destination[$field]), $search)) {
                    return true;
                }
            }
            return false;
        });
    }

    $tag = (string) ($_GET['tag'] ?? '');
    if ($tag !== '') {
        $destinations = array_filter(
            $destinations,
            fn (array $destination) => in_array($tag, array_column($destination['tags'], 'name'), true),
        );
    }

    respond(array_values($destinations));
}

function lower(string $value): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
}

function create_destination(): never
{
    $user = require_user();
    $input = validate_destination(json_body());
    $id = uuid();
    $timestamp = now();

    db()->beginTransaction();
    db()->prepare('INSERT INTO "Destination" (id, name, address, googleMapsLink, description, rating, favorite, visited, privateNotes, createdAt, updatedAt, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$id, $input['name'], $input['address'], $input['googleMapsLink'], $input['description'], $input['rating'], (int) $input['favorite'], (int) $input['visited'], $input['privateNotes'], $timestamp, $timestamp, $user['id']]);
    set_destination_tags($id, $input['tagIds'] ?? []);
    db()->commit();

    respond(load_destination(own_destination($id)), 201);
}

function update_destination(string $id): never
{
    own_destination($id);
    $input = validate_destination(json_body());

    db()->beginTransaction();
    db()->prepare('UPDATE "Destination" SET name = ?, address = ?, googleMapsLink = ?, description = ?, rating = ?, favorite = ?, visited = ?, privateNotes = ?, updatedAt = ? WHERE id = ?')
        ->execute([$input['name'], $input['address'], $input['googleMapsLink'], $input['description'], $input['rating'], (int) $input['favorite'], (int) $input['visited'], $input['privateNotes'], now(), $id]);
    if ($input['tagIds'] !== null) {
        set_destination_tags($id, $input['tagIds']);
    }
    db()->commit();

    respond(load_destination(own_destination($id)));
}

function set_destination_tags(string $destinationId, array $tagIds): void
{
    db()->prepare('DELETE FROM "DestinationTag" WHERE destinationId = ?')->execute([$destinationId]);
    $insert = db()->prepare('INSERT OR IGNORE INTO "DestinationTag" (destinationId, tagId) SELECT ?, id FROM "Tag" WHERE id = ?');
    foreach (array_unique($tagIds) as $tagId) {
        $insert->execute([$destinationId, $tagId]);
    }
}

function delete_destination(string $id): never
{
    own_destination($id);
    db()->prepare('UPDATE "Destination" SET deletedAt = ?, updatedAt = ? WHERE id = ?')->execute([now(), now(), $id]);
    respond(['ok' => true]);
}

// ---------------------------------------------------------------- Tags

function list_tags(): never
{
    require_user();
    respond(db()->query('SELECT id, name FROM "Tag" ORDER BY name')->fetchAll());
}

function assert_tag_name_free(string $name, ?string $exceptId = null): void
{
    $stmt = db()->prepare('SELECT id FROM "Tag" WHERE name = ?');
    $stmt->execute([$name]);
    $existing = $stmt->fetchColumn();
    if ($existing !== false && $existing !== $exceptId) {
        fail(409, 'CONFLICT', 'Diesen Tag gibt es bereits');
    }
}

function create_tag(): never
{
    require_user();
    $name = validate_tag(json_body());
    assert_tag_name_free($name);
    $tag = ['id' => uuid(), 'name' => $name];
    db()->prepare('INSERT INTO "Tag" (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)')
        ->execute([$tag['id'], $name, now(), now()]);
    respond($tag, 201);
}

function update_tag(string $id): never
{
    require_admin();
    $name = validate_tag(json_body());
    assert_tag_name_free($name, $id);
    $stmt = db()->prepare('UPDATE "Tag" SET name = ?, updatedAt = ? WHERE id = ?');
    $stmt->execute([$name, now(), $id]);
    if ($stmt->rowCount() === 0) {
        fail(404, 'NOT_FOUND', 'Tag nicht gefunden');
    }
    respond(['id' => $id, 'name' => $name]);
}

function delete_tag(string $id): never
{
    require_admin();
    $stmt = db()->prepare('DELETE FROM "Tag" WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        fail(404, 'NOT_FOUND', 'Tag nicht gefunden');
    }
    respond(['ok' => true]);
}

// ---------------------------------------------------------------- Bilder

function upload_image(): never
{
    // Überschreitet die Anfrage post_max_size, verwirft PHP $_POST und $_FILES komplett.
    if (!$_POST && !$_FILES && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        fail(400, 'VALIDATION_ERROR', 'Das Bild ist zu groß für die Server-Einstellungen (post_max_size)');
    }
    $destination = own_destination((string) ($_POST['destinationId'] ?? ''));
    $file = $_FILES['file'] ?? null;

    if (!is_array($file) || !is_string($file['tmp_name'] ?? null) || $file['error'] === UPLOAD_ERR_NO_FILE) {
        fail(400, 'VALIDATION_ERROR', 'Datei oder Ziel fehlt');
    }
    if (in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || $file['size'] > MAX_IMAGE_BYTES) {
        fail(400, 'VALIDATION_ERROR', 'Das Bild ist zu groß (maximal ' . (MAX_IMAGE_BYTES / 1024 / 1024) . ' MB)');
    }
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        fail(400, 'VALIDATION_ERROR', 'Upload fehlgeschlagen');
    }

    $info = @getimagesize($file['tmp_name']);
    $type = $info ? (ALLOWED_IMAGE_TYPES[$info[2]] ?? null) : null;
    if ($type === null) {
        fail(400, 'VALIDATION_ERROR', 'Nur JPEG, PNG, GIF und WebP werden unterstützt');
    }

    $image = [
        'id' => uuid(),
        'destinationId' => $destination['id'],
        'mimeType' => $type[0],
        'filesize' => (int) $file['size'],
        'createdAt' => now(),
    ];
    $filename = $image['id'] . '.' . $type[1];
    if (!move_uploaded_file($file['tmp_name'], data_dir() . '/uploads/' . $filename)) {
        throw new RuntimeException('Bild konnte nicht gespeichert werden');
    }

    db()->prepare('INSERT INTO "DestinationImage" (id, destinationId, filename, mimeType, filesize, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$image['id'], $image['destinationId'], $filename, $image['mimeType'], $image['filesize'], $image['createdAt']]);

    $image['url'] = 'api.php?r=images/' . $image['id'] . '/file';
    respond($image, 201);
}

function own_image(string $id): array
{
    $user = require_user();
    $stmt = db()->prepare('SELECT i.* FROM "DestinationImage" i JOIN "Destination" d ON d.id = i.destinationId WHERE i.id = ? AND d.createdBy = ?');
    $stmt->execute([$id, $user['id']]);
    return $stmt->fetch() ?: fail(404, 'NOT_FOUND', 'Bild nicht gefunden');
}

function image_path(array $image): string
{
    return data_dir() . '/uploads/' . basename($image['filename']);
}

function send_image(string $id): never
{
    $path = image_path(own_image($id));
    if (!is_file($path)) {
        fail(404, 'NOT_FOUND', 'Bild nicht gefunden');
    }
    session_write_close();
    header_remove('Cache-Control');
    header('Cache-Control: private, max-age=86400');
    header('Content-Type: ' . own_image_mime($path));
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

function own_image_mime(string $path): string
{
    $info = @getimagesize($path);
    return $info ? (ALLOWED_IMAGE_TYPES[$info[2]][0] ?? 'application/octet-stream') : 'application/octet-stream';
}

function delete_image(string $id): never
{
    $image = own_image($id);
    db()->prepare('DELETE FROM "DestinationImage" WHERE id = ?')->execute([$id]);
    @unlink(image_path($image));
    respond(['ok' => true]);
}
