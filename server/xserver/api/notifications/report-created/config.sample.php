<?php
declare(strict_types=1);

return [
    'app_url' => 'https://report.daigo-kogyo.com',
    'supabase_url' => 'https://your-project-ref.supabase.co',
    'supabase_anon_key' => 'your-anon-key',

    'mail_to' => [
        'recipient@example.com',
    ],
    // 土木工事の工事分類IDを指定すると、名前ではなくIDで追加通知を判定します。
    'civil_work_category_ids' => [
        'replace-with-civil-work-category-id',
    ],
    'civil_work_mail_to' => [
        'civil-work-recipient@example.com',
    ],
    'mail_from' => 'sender@example.com',
];
