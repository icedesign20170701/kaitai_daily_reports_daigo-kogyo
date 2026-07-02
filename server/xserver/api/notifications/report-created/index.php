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

function log_notification(string $message): void
{
    error_log('[report-created-notification] ' . $message);
}

function fail_json(int $status, string $message): void
{
    log_notification($status . ' ' . $message);
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

function access_token(): string
{
    $customHeader = $_SERVER['HTTP_X_SUPABASE_ACCESS_TOKEN'] ?? '';
    if (is_string($customHeader) && trim($customHeader) !== '') {
        return trim($customHeader);
    }

    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!is_string($header) || !preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        fail_json(401, 'Supabase access token is required');
    }

    return trim($matches[1]);
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
        log_notification('Supabase user verification failed. status=' . (string)$response['status']);
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

function configured_recipients(array $config): array
{
    $to = $config['mail_to'] ?? [];
    if (!is_array($to) || count($to) === 0) {
        fail_json(500, 'mail_to is missing');
    }

    $recipients = [];
    foreach ($to as $address) {
        if (!is_string($address)) {
            fail_json(500, 'mail_to is invalid');
        }

        $address = trim($address);
        if (!filter_var($address, FILTER_VALIDATE_EMAIL)) {
            fail_json(500, 'mail_to is invalid');
        }

        $recipients[] = $address;
    }

    return $recipients;
}

function configured_sender(array $config): string
{
    $from = trim((string)($config['mail_from'] ?? ''));
    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
        fail_json(500, 'mail_from is invalid');
    }

    return $from;
}

function send_email(array $config, string $subject, string $message): bool
{
    $to = configured_recipients($config);
    $from = configured_sender($config);
    $headers = [
        'From: ' . $from,
        'Reply-To: ' . $from,
        'Content-Type: text/plain; charset=UTF-8',
    ];
    $additionalParams = '-f' . $from;

    if (function_exists('mb_language')) {
        mb_language('Japanese');
    }
    if (function_exists('mb_internal_encoding')) {
        mb_internal_encoding('UTF-8');
    }
    if (function_exists('mb_send_mail')) {
        $sent = mb_send_mail(implode(',', $to), $subject, $message, implode("\r\n", $headers), $additionalParams);
        log_notification('mb_send_mail result=' . ($sent ? 'success' : 'failure') . ' to_count=' . (string)count($to));
        return $sent;
    }

    $sent = mail(implode(',', $to), $subject, $message, implode("\r\n", $headers), $additionalParams);
    log_notification('mail result=' . ($sent ? 'success' : 'failure') . ' to_count=' . (string)count($to));
    return $sent;
}

$config = load_config();
verify_supabase_user($config, access_token());

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

if (!$mailOk) {
    fail_json(502, 'notification delivery failed');
}

echo json_encode(['ok' => true, 'mailToCount' => count(configured_recipients($config))], JSON_UNESCAPED_UNICODE);
