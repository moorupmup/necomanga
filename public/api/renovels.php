<?php
/**
 * ReNovels On-The-Fly API Gateway & Image Streaming Proxy
 * High-performance, zero-database stateless reverse proxy for ReNovels
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
    if (preg_match('#^/api/renovels/(.*)$#', $path, $matches)) {
        $route = $matches[1];
    }
}

// 1. Chapter / Cover Image Streaming Proxy
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
    $allowedHosts = ['renovels.org', 'remanga.org', 'reimg.org', 'reimg2.org', 'img.reimg.org', 'img-reserve.reimg2.org'];

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
    curl_setopt($ch, CURLOPT_REFERER, 'https://renovels.org/');
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
$rawQuery = $_SERVER['QUERY_STRING'] ?? '';
$rawQuery = preg_replace('/(^|&)_route=[^&]*/', '', $rawQuery);
$rawQuery = ltrim($rawQuery, '&');
$queryString = $rawQuery !== '' ? '?' . $rawQuery : '';

$targetUrl = '';

if ($route === 'catalog') {
    $targetUrl = 'https://api.renovels.org/api/search/catalog/' . $queryString;
} elseif ($route === 'top' || $route === 'titles/top' || $route === 'v2/titles/top') {
    $targetUrl = 'https://api.renovels.org/api/v2/titles/top/' . $queryString;
} elseif ($route === 'search') {
    $targetUrl = 'https://api.renovels.org/api/v2/search/' . $queryString;
} elseif ($route === 'forms') {
    $targetUrl = 'https://api.renovels.org/api/forms/titles/' . $queryString;
} elseif ($route === 'chapters') {
    $targetUrl = 'https://api.renovels.org/api/titles/chapters/' . $queryString;
} elseif (preg_match('#^chapter/(\d+)#', $route, $m)) {
    $targetUrl = 'https://api.renovels.org/api/v2/titles/chapters/' . $m[1] . '/';
} elseif (preg_match('#^title/([^/?]+)#', $route, $m)) {
    $slug = urldecode($m[1]);
    $title = $_GET['title'] ?? '';

    // Fast path: try the exact slug first
    $targetUrl = 'https://api.renovels.org/api/titles/' . rawurlencode($slug) . '/';
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'remanga/1.1.6 CFNetwork/1408.0.4 Darwin/22.5.0');
    curl_setopt($ch, CURLOPT_REFERER, 'https://renovels.org/');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $hasContent = false;
    if ($httpCode === 200 && !empty($response)) {
        $json = json_decode($response, true);
        if (!empty($json['content']['id'])) {
            $hasContent = true;
        }
    }

    if (!$hasContent) {
        // Run smart fallback resolver
        [$fallbackCode, $fallbackBody] = fetchRenovelsTitleWithFallback($slug, $title);
        $httpCode = $fallbackCode;
        $response = $fallbackBody;
    }

    header('Content-Type: application/json; charset=utf-8');
    http_response_code($httpCode ?: 500);
    echo $response ?: json_encode(['error' => 'Title not found']);
    exit;
} else {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unknown ReNovels API route', 'route' => $route]);
    exit;
}

// Execute upstream API request
$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'remanga/1.1.6 CFNetwork/1408.0.4 Darwin/22.5.0');
curl_setopt($ch, CURLOPT_REFERER, 'https://renovels.org/');
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_TIMEOUT, 12);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

header('Content-Type: application/json; charset=utf-8');
http_response_code($httpCode ?: 500);
echo $response ?: json_encode(['error' => 'Empty response from upstream']);
exit;

/**
 * Smart Fallback Resolver for ReNovels Titles
 */
function fetchRenovelsTitleWithFallback(string $slug, string $title = ''): array {
    $candidates = [];
    if (!str_starts_with($slug, 'rn')) {
        $candidates[] = 'rn' . $slug;
    }
    $stripped = preg_replace('/^(novel-|\d+-)/', '', $slug);
    if ($stripped !== $slug) {
        $candidates[] = $stripped;
        $candidates[] = 'rn' . $stripped;
    }
    $candidates = array_unique($candidates);

    foreach ($candidates as $cand) {
        $url = 'https://api.renovels.org/api/titles/' . rawurlencode($cand) . '/';
        $res = executeRenovelsRequest($url);
        if ($res['code'] === 200 && !empty($res['body'])) {
            $json = json_decode($res['body'], true);
            if (!empty($json['content']['id'])) {
                return [$res['code'], $res['body']];
            }
        }
    }

    // Search ReNovels by title or slug keywords
    $queries = [];
    if (!empty($title)) {
        $cleanTitle = trim(preg_replace('/\s*\(.*?\)\s*/', ' ', $title));
        if (mb_strlen($cleanTitle) >= 2) {
            $queries[] = $cleanTitle;
        }
    }
    $slugWords = trim(preg_replace('/^(rn|novel-|\d+-)/', '', $slug));
    $slugWords = str_replace(['-', '_'], ' ', $slugWords);
    if (strlen($slugWords) >= 3) {
        $queries[] = $slugWords;
    }

    foreach ($queries as $q) {
        $searchUrl = 'https://api.renovels.org/api/v2/search/?query=' . rawurlencode($q);
        $searchRes = executeRenovelsRequest($searchUrl);
        if ($searchRes['code'] === 200 && !empty($searchRes['body'])) {
            $searchJson = json_decode($searchRes['body'], true);
            $results = $searchJson['results'] ?? [];
            foreach ($results as $item) {
                if (!empty($item['dir'])) {
                    $candDirs = [$item['dir']];
                    if (!str_starts_with($item['dir'], 'rn')) {
                        $candDirs[] = 'rn' . $item['dir'];
                    }
                    foreach ($candDirs as $cd) {
                        $tryUrl = 'https://api.renovels.org/api/titles/' . rawurlencode($cd) . '/';
                        $tRes = executeRenovelsRequest($tryUrl);
                        if ($tRes['code'] === 200 && !empty($tRes['body'])) {
                            $tJson = json_decode($tRes['body'], true);
                            if (!empty($tJson['content']['id'])) {
                                return [$tRes['code'], $tRes['body']];
                            }
                        }
                    }
                }
            }
        }
    }

    return [404, json_encode(['msg' => 'Тайтл не найден', 'content' => null])];
}

function executeRenovelsRequest(string $url): array {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'remanga/1.1.6 CFNetwork/1408.0.4 Darwin/22.5.0');
    curl_setopt($ch, CURLOPT_REFERER, 'https://renovels.org/');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => $body];
}
