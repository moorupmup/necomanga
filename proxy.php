<?php
/**
 * ReManga On-the-fly Stateless API & Image Gateway
 * High performance proxy for ReManga API & image hotlinking bypass
 */

function handleReMangaProxy(string $uri): bool {
    if (!str_starts_with($uri, '/api/remanga/')) {
        return false;
    }

    // CORS & Common Headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    $subPath = substr($uri, strlen('/api/remanga/'));

    // 1. Chapter Image Streaming Proxy
    if ($subPath === 'img' || str_starts_with($subPath, 'img?')) {
        $imageUrl = $_GET['url'] ?? '';
        if (empty($imageUrl)) {
            http_response_code(400);
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
            echo json_encode(['error' => 'Disallowed domain']);
            exit;
        }

        // Rewrite img.reimg.org to img-reserve.reimg2.org to avoid Cloudflare 403
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

        // Set caching headers for browser
        header('Cache-Control: public, max-age=2592000, immutable');
        curl_exec($ch);
        curl_close($ch);
        exit;
    }

    $rawQuery = $_SERVER['QUERY_STRING'] ?? '';
    $rawQuery = preg_replace('/(^|&)_route=[^&]*/', '', $rawQuery);
    $rawQuery = ltrim($rawQuery, '&');
    $queryString = $rawQuery !== '' ? '?' . $rawQuery : '';

    $targetUrl = '';

    if ($subPath === 'catalog') {
        $targetUrl = 'https://api.remanga.org/api/search/catalog/' . $queryString;
    } elseif ($subPath === 'search') {
        $targetUrl = 'https://api.remanga.org/api/v2/search/' . $queryString;
    } elseif ($subPath === 'forms') {
        $targetUrl = 'https://api.remanga.org/api/forms/titles/' . $queryString;
    } elseif ($subPath === 'chapters') {
        $targetUrl = 'https://api.remanga.org/api/titles/chapters/' . $queryString;
    } elseif (preg_match('#^chapter/(\d+)#', $subPath, $m)) {
        $targetUrl = 'https://api.remanga.org/api/v2/titles/chapters/' . $m[1] . '/';
    } elseif (preg_match('#^title/([^/?]+)#', $subPath, $m)) {
        $slug = urldecode($m[1]);
        $targetUrl = 'https://api.remanga.org/api/titles/' . rawurlencode($slug) . '/';
    } elseif ($subPath === 'top' || str_starts_with($subPath, 'top?')) {
        $targetUrl = 'https://api.remanga.org/api/v2/titles/top/' . $queryString;
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Unknown ReManga API route']);
        exit;
    }

    // Execute API request
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    curl_setopt($ch, CURLOPT_REFERER, 'https://remanga.org/');
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
}

/**
 * ReNovels On-the-fly Stateless API & Image Gateway
 */
function handleReNovelsProxy(string $uri): bool {
    if (!str_starts_with($uri, '/api/renovels/')) {
        return false;
    }

    // CORS & Common Headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    $subPath = substr($uri, strlen('/api/renovels/'));

    // 1. Chapter / Cover Image Streaming Proxy
    if ($subPath === 'img' || str_starts_with($subPath, 'img?')) {
        $imageUrl = $_GET['url'] ?? '';
        if (empty($imageUrl)) {
            http_response_code(400);
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
            echo json_encode(['error' => 'Disallowed domain']);
            exit;
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

        // Set caching headers for browser
        header('Cache-Control: public, max-age=2592000, immutable');
        curl_exec($ch);
        curl_close($ch);
        exit;
    }

    $rawQuery = $_SERVER['QUERY_STRING'] ?? '';
    $rawQuery = preg_replace('/(^|&)_route=[^&]*/', '', $rawQuery);
    $rawQuery = ltrim($rawQuery, '&');
    $queryString = $rawQuery !== '' ? '?' . $rawQuery : '';

    $targetUrl = '';

    if ($subPath === 'catalog') {
        $targetUrl = 'https://api.renovels.org/api/search/catalog/' . $queryString;
    } elseif ($subPath === 'search') {
        $targetUrl = 'https://api.renovels.org/api/v2/search/' . $queryString;
    } elseif ($subPath === 'forms') {
        $targetUrl = 'https://api.renovels.org/api/forms/titles/' . $queryString;
    } elseif ($subPath === 'chapters') {
        $targetUrl = 'https://api.renovels.org/api/titles/chapters/' . $queryString;
    } elseif (preg_match('#^chapter/(\d+)#', $subPath, $m)) {
        $targetUrl = 'https://api.renovels.org/api/v2/titles/chapters/' . $m[1] . '/';
    } elseif (preg_match('#^title/([^/?]+)#', $subPath, $m)) {
        $slug = urldecode($m[1]);
        $title = $_GET['title'] ?? '';

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
            [$fallbackCode, $fallbackBody] = fetchProxyRenovelsTitleFallback($slug, $title);
            $httpCode = $fallbackCode;
            $response = $fallbackBody;
        }

        header('Content-Type: application/json; charset=utf-8');
        http_response_code($httpCode ?: 500);
        echo $response ?: json_encode(['error' => 'Title not found']);
        exit;
    } elseif ($subPath === 'top' || str_starts_with($subPath, 'top?')) {
        $targetUrl = 'https://api.renovels.org/api/v2/titles/top/' . $queryString;
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Unknown ReNovels API route']);
        exit;
    }

    // Execute API request
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
}

function fetchProxyRenovelsTitleFallback(string $slug, string $title = ''): array {
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
        $res = executeProxyRenovelsReq($url);
        if ($res['code'] === 200 && !empty($res['body'])) {
            $json = json_decode($res['body'], true);
            if (!empty($json['content']['id'])) {
                return [$res['code'], $res['body']];
            }
        }
    }

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
        $searchRes = executeProxyRenovelsReq($searchUrl);
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
                        $tRes = executeProxyRenovelsReq($tryUrl);
                        if ($tRes['code'] === 200 && !empty($tRes['body'])) {
                            $tJson = json_decode($tRes['body'], true);
                            if (!empty($tJson['content']['id'])) {
                                return [$tRes['code'], $tJson['content']['rus_name'] ?? $tJson['content']['main_name'] ?? $cd, $tRes['body']];
                            }
                        }
                    }
                }
            }
        }
    }

    return [404, json_encode(['msg' => 'Тайтл не найден', 'content' => null])];
}

function executeProxyRenovelsReq(string $url): array {
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
