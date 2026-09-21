<?php
/**
 * MangaDex RU Reader - PHP Server Fallback & Optional Image Proxy
 * Allows deployment on shared hosting, Open Server, cPanel, Apache/Nginx
 */

// Optional lightweight proxy for MangaDex API or images (useful if ISP blocks direct connections)
if (isset($_GET['proxy'])) {
    $targetUrl = $_GET['proxy'];
    
    // Security: Only allow proxying from MangaDex domains
    $parsed = parse_url($targetUrl);
    $host = $parsed['host'] ?? '';
    
    $allowedHosts = [
        'api.mangadex.org',
        'uploads.mangadex.org'
    ];
    
    $isAllowed = false;
    foreach ($allowedHosts as $allowed) {
        if ($host === $allowed || str_ends_with($host, '.mangadex.network') || str_ends_with($host, '.mangadex.org')) {
            $isAllowed = true;
            break;
        }
    }
    
    if (!$isAllowed) {
        http_response_code(403);
        die('Forbidden target host');
    }
    
    // Forward request
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_USERAGENT, 'MangaDexRUReader/1.0');
    
    $response = curl_exec($ch);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    header('Access-Control-Allow-Origin: *');
    if ($contentType) {
        header("Content-Type: $contentType");
    }
    http_response_code($httpCode ?: 200);
    echo $response;
    exit;
}

// SPA Routing: Serve index.html if it exists
if (file_exists(__DIR__ . '/index.html')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . '/index.html');
    exit;
}

// Fallback message if build has not been run yet
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MangaDex RU — Готов к сборке</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; max-width: 520px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); border: 1px solid #334155; }
        h1 { color: #60a5fa; margin-top: 0; font-size: 1.5rem; }
        p { line-height: 1.6; color: #94a3b8; }
        code { background: #0f172a; padding: 0.2rem 0.5rem; border-radius: 0.375rem; color: #38bdf8; font-size: 0.9em; }
        .btn { display: inline-block; background: #2563eb; color: #fff; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 500; margin-top: 1rem; }
    </style>
</head>
<body>
    <div class="card">
        <h1>MangaDex RU Reader</h1>
        <p>PHP-сервер активен и готов к раздаче SPA приложения.</p>
        <p>Для разработки запустите: <br><code>npm run dev</code> (доступно на http://localhost:3000)</p>
        <p>Для создания готового статического сайта для этого хостинга выполните: <br><code>npm run generate</code></p>
    </div>
</body>
</html>
