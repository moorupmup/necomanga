<?php
/**
 * ReManga On-The-Fly API Gateway & Image Streaming Proxy
 * High-performance, zero-database stateless reverse proxy for ReManga
 */

// Global CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$route = $_GET['_route'] ?? '';
unset($_GET['_route']);

// If _route is empty, try to parse from REQUEST_URI
if (empty($route)) {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (preg_match('#^/api/remanga/(.*)$#', $path, $matches)) {
        $route = $matches[1];
    }
}

// 1. Chapter Image Streaming Proxy
if ($route === 'img' || str_starts_with($route, 'img?')) {
    $imageUrl = $_GET['url'] ?? '';
    if (empty($imageUrl)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Missing url parameter']);
        exit;
    }

    // Validate domain
    $parsed = parse_url($imageUrl);
    $host = strtolower($parsed['host'] ?? '');
    $allowedHosts = ['remanga.org', 'reimg.org', 'reimg2.org', 'img.reimg.org', 'img-reserve.reimg2.org'];

    $isAllowed = false;
    foreach ($allowedHosts as $allowed) {
        if ($host === $allowed || str_ends_with($host, '.' . $allowed)) {
            $isAllowed = true;
            break;
        }
    }

    if (!$isAllowed) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Disallowed domain: ' . $host]);
        exit;
    }

    // Rewrite img.reimg.org to img-reserve.reimg2.org to avoid Cloudflare 403 hotlink protection
    if ($host === 'img.reimg.org') {
        $imageUrl = str_replace('img.reimg.org', 'img-reserve.reimg2.org', $imageUrl);
    }

    // Stream image via cURL
    $ch = curl_init($imageUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_REFERER, 'https://remanga.org/');
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $header) {
        $len = strlen($header);
        $parts = explode(':', $header, 2);
        if (count($parts) === 2) {
            $name = strtolower(trim($parts[0]));
            $val = trim($parts[1]);
            if ($name === 'content-type' || $name === 'content-length' || $name === 'etag') {
                header("$name: $val");
            }
        }
        return $len;
    });

    // Set aggressive caching for images (30 days)
    header('Cache-Control: public, max-age=2592000, immutable');
    curl_exec($ch);
    curl_close($ch);
    exit;
}

// 2. Determine target API endpoint
$targetUrl = '';
$queryParams = $_GET;

if ($route === 'catalog') {
    $targetUrl = 'https://api.remanga.org/api/search/catalog/?' . http_build_query($queryParams);
} elseif ($route === 'search') {
    $targetUrl = 'https://api.remanga.org/api/v2/search/?' . http_build_query($queryParams);
} elseif ($route === 'forms') {
    $targetUrl = 'https://api.remanga.org/api/forms/titles/?' . http_build_query($queryParams);
} elseif ($route === 'chapters') {
    $targetUrl = 'https://api.remanga.org/api/titles/chapters/?' . http_build_query($queryParams);
} elseif (preg_match('#^chapter/(\d+)#', $route, $m)) {
    $targetUrl = 'https://api.remanga.org/api/v2/titles/chapters/' . $m[1] . '/';
} elseif (preg_match('#^title/([^/?]+)#', $route, $m)) {
    $slug = urldecode($m[1]);
    $targetUrl = 'https://api.remanga.org/api/titles/' . rawurlencode($slug) . '/';
} else {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unknown ReManga API route', 'route' => $route]);
    exit;
}

// Execute upstream API request
$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
curl_setopt($ch, CURLOPT_REFERER, 'https://remanga.org/');
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

header('Content-Type: application/json; charset=utf-8');
http_response_code($httpCode ?: 500);
echo $response ?: json_encode(['error' => 'Empty response from upstream']);
exit;
