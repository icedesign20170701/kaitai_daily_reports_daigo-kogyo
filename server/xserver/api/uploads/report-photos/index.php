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

$maxBytes = 10 * 1024 * 1024;
$allowedMimeTypes = [
    'image/avif' => 'avif',
    'image/gif' => 'gif',
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];

function fail_json(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
    fail_json(400, 'file is required');
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    fail_json(400, 'file upload failed');
}

if (($file['size'] ?? 0) <= 0 || $file['size'] > $maxBytes) {
    fail_json(400, 'file size is invalid');
}

$reportId = (string)($_POST['reportId'] ?? '');
if (!preg_match('/^[0-9a-fA-F-]{36}$/', $reportId)) {
    fail_json(400, 'reportId is invalid');
}

$tmpName = (string)$file['tmp_name'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($tmpName);
if (!is_string($mimeType) || !isset($allowedMimeTypes[$mimeType])) {
    fail_json(400, 'unsupported image type');
}

$extension = $allowedMimeTypes[$mimeType];
$uploadRoot = dirname(__DIR__, 3) . '/uploads/report-photos';
$targetDir = $uploadRoot . '/' . $reportId;

if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true)) {
    fail_json(500, 'failed to create upload directory');
}

$filename = date('YmdHis') . '-' . bin2hex(random_bytes(8)) . '.' . $extension;
$targetPath = $targetDir . '/' . $filename;

if (!move_uploaded_file($tmpName, $targetPath)) {
    fail_json(500, 'failed to save uploaded file');
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = (string)($_SERVER['HTTP_HOST'] ?? 'report.daigo-kogyo.com');
$url = $scheme . '://' . $host . '/uploads/report-photos/' . rawurlencode($reportId) . '/' . rawurlencode($filename);

echo json_encode(['url' => $url], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
