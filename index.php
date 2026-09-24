<?php
/**
 * MangaDex RU - Open Server & Local Apache Handler
 * Automatically routes requests to .output/public static build
 */

$publicDir = __DIR__ . '/.output/public';

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// ReManga & ReNovels API & Image Streaming Gateways
if (str_starts_with($uri, '/api/remanga/')) {
    require_once __DIR__ . '/proxy.php';
    handleReMangaProxy($uri);
    exit;
}

if (str_starts_with($uri, '/api/renovels/')) {
    require_once __DIR__ . '/proxy.php';
    handleReNovelsProxy($uri);
    exit;
}

// If build does not exist yet, show instruction page
if (!is_dir($publicDir) || !file_exists($publicDir . '/index.html')) {
    ?>
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <title>MangaDex RU — Сборка не найдена</title>
        <style>
            body { font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2rem; border-radius: 1rem; max-width: 500px; text-align: center; border: 1px solid #334155; }
            h1 { color: #60a5fa; }
            code { background: #0f172a; padding: 0.2rem 0.5rem; border-radius: 4px; color: #38bdf8; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>MangaDex RU Reader</h1>
            <p>Статическая сборка ещё не сгенерирована.</p>
            <p>Выполните в терминале: <br><code>npm run generate</code></p>
            <p>Либо запустите режим разработки: <br><code>npm run dev</code> (http://localhost:3000)</p>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// Extract requested path
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$filePath = realpath($publicDir . $uri);

// Prevent directory traversal
if ($filePath && str_starts_with($filePath, realpath($publicDir)) && is_file($filePath)) {
    $mime = mime_content_type($filePath);
    $ext = pathinfo($filePath, PATHINFO_EXTENSION);
    
    if ($ext === 'js') $mime = 'application/javascript';
    if ($ext === 'css') $mime = 'text/css';
    if ($ext === 'svg') $mime = 'image/svg+xml';

    if ($mime) header("Content-Type: $mime");
    header('Access-Control-Allow-Origin: *');
    readfile($filePath);
    exit;
}

// Fallback to index.html for all SPA routes (/manga/..., /read/..., /catalog...)
header('Content-Type: text/html; charset=utf-8');
header('Access-Control-Allow-Origin: *');
readfile($publicDir . '/index.html');
exit;
