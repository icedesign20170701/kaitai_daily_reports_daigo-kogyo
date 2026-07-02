<?php
declare(strict_types=1);

return [
    'supabase_url' => 'https://your-project-ref.supabase.co',
    'supabase_anon_key' => 'your-anon-key',

    'mail_to' => [
        'recipient@example.com',
    ],
    'mail_from' => 'no-reply@report.daigo-kogyo.com',

    // LINE Messaging API channel access token.
    // Send target IDs can be user IDs, group IDs, or room IDs.
    'line_channel_access_token' => '',
    'line_to' => [
        // 'Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    ],
];
