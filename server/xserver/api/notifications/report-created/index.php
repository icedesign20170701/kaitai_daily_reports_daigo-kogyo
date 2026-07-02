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

function load_config(): array
{
    $path = __DIR__ . '/config.php';
    if (!is_file($path)) {
        fail_json(500, 'notification config is missing');
    }

    $config = require $path;
    if (!is_array($config)) {
        fail_json(500, 'notification config is invalid');
    }

    return $config;
}

function bearer_token(): string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!is_string($header) || !preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        fail_json(401, 'Authorization bearer token is required');
    }

    return trim($matches[1]);
}

function post_json(string $url, array $headers, array $payload): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT => 10,
    ]);

    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    return ['status' => $status, 'body' => is_string($body) ? $body : '', 'error' => $error];
}

function get_json(string $url, array $headers): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 10,
    ]);

    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    return ['status' => $status, 'body' => is_string($body) ? $body : '', 'error' => $error];
}

function verify_supabase_user(array $config, string $accessToken): void
{
    $supabaseUrl = rtrim((string)($config['supabase_url'] ?? ''), '/');
    $anonKey = (string)($config['supabase_anon_key'] ?? '');
    if ($supabaseUrl === '' || $anonKey === '') {
        fail_json(500, 'Supabase config is missing');
    }

    $response = get_json($supabaseUrl . '/auth/v1/user', [
        'apikey: ' . $anonKey,
        'Authorization: Bearer ' . $accessToken,
    ]);

    if ($response['status'] < 200 || $response['status'] >= 300) {
        fail_json(401, 'Supabase user verification failed');
    }
}

function require_string(array $payload, string $key): string
{
    $value = $payload[$key] ?? '';
    if (!is_string($value)) {
        fail_json(400, $key . ' is invalid');
    }

    return trim($value);
}

function build_message(array $payload): string
{
    return implode("\n", [
        '日報が送信されました。',
        '',
        '作業日: ' . require_string($payload, 'reportDate'),
        '現場: ' . require_string($payload, 'siteName'),
        '工事分類: ' . require_string($payload, 'workCategoryName'),
        '記入者: ' . require_string($payload, 'reporterName'),
        '日報ID: ' . require_string($payload, 'reportId'),
    ]);
}

function send_email(array $config, string $subject, string $message): bool
{
    $to = $config['mail_to'] ?? [];
    if (!is_array($to) || count($to) === 0) {
        return true;
    }

    $from = (string)($config['mail_from'] ?? 'no-reply@report.daigo-kogyo.com');
    $headers = [
        'From: ' . $from,
        'Content-Type: text/plain; charset=UTF-8',
    ];

    if (function_exists('mb_language')) {
        mb_language('Japanese');
    }
    if (function_exists('mb_internal_encoding')) {
        mb_internal_encoding('UTF-8');
    }
    if (function_exists('mb_send_mail')) {
        return mb_send_mail(implode(',', $to), $subject, $message, implode("\r\n", $headers));
    }

    return mail(implode(',', $to), $subject, $message, implode("\r\n", $headers));
}

function send_line(array $config, string $message): bool
{
    $token = (string)($config['line_channel_access_token'] ?? '');
    $targets = $config['line_to'] ?? [];
    if ($token === '' || !is_array($targets) || count($targets) === 0) {
        return true;
    }

    foreach ($targets as $target) {
        if (!is_string($target) || trim($target) === '') {
            continue;
        }

        $response = post_json('https://api.line.me/v2/bot/message/push', [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ], [
            'to' => trim($target),
            'messages' => [
                ['type' => 'text', 'text' => $message],
            ],
        ]);

        if ($response['status'] < 200 || $response['status'] >= 300) {
            return false;
        }
    }

    return true;
}

$config = load_config();
verify_supabase_user($config, bearer_token());

$body = file_get_contents('php://input');
$payload = json_decode($body === false ? '' : $body, true);
if (!is_array($payload)) {
    fail_json(400, 'JSON body is invalid');
}

$reportId = require_string($payload, 'reportId');
if (!preg_match('/^[0-9a-fA-F-]{36}$/', $reportId)) {
    fail_json(400, 'reportId is invalid');
}

$message = build_message($payload);
$subject = '日報が送信されました';
$mailOk = send_email($config, $subject, $message);
$lineOk = send_line($config, $message);

if (!$mailOk || !$lineOk) {
    fail_json(502, 'notification delivery failed');
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
