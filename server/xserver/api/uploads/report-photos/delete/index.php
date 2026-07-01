<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

function fail_json(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

$body = file_get_contents('php://input');
$payload = json_decode($body === false ? '' : $body, true);
if (!is_array($payload) || !isset($payload['url']) || !is_string($payload['url'])) {
    fail_json(400, 'url is required');
}

$path = parse_url($payload['url'], PHP_URL_PATH);
if (!is_string($path) || !preg_match('#^/uploads/report-photos/([0-9a-fA-F-]{36})/([^/]+)$#', $path, $matches)) {
    fail_json(400, 'url is invalid');
}

$filename = rawurldecode($matches[2]);
if ($filename !== basename($filename)) {
    fail_json(400, 'filename is invalid');
}

$uploadRoot = dirname(__DIR__, 5) . '/uploads/report-photos';
$targetPath = $uploadRoot . '/' . $matches[1] . '/' . $filename;
$realRoot = realpath($uploadRoot);
$realTarget = realpath($targetPath);

if ($realRoot === false || $realTarget === false || strpos($realTarget, $realRoot . DIRECTORY_SEPARATOR) !== 0) {
    fail_json(404, 'file not found');
}

if (!unlink($realTarget)) {
    fail_json(500, 'failed to delete file');
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
