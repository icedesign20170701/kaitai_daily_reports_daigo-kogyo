import { supabase } from "@/lib/supabase";

const notificationUrl = import.meta.env.VITE_REPORT_NOTIFICATION_URL;

type ReportNotificationPayload = {
  reportId: string;
  reportDate: string;
  siteName: string;
  reporterName: string;
  workCategoryId: string;
  workCategoryName: string;
};

function normalizeEndpointUrl(url: string) {
  return url.endsWith("/") ? url : `${url}/`;
}

export async function notifyReportCreated(payload: ReportNotificationPayload) {
  if (!notificationUrl) {
    throw new Error("通知API URLが未設定です。VITE_REPORT_NOTIFICATION_URL を設定して再ビルドしてください。");
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("通知送信に必要なログイン情報を取得できませんでした。");
  }

  const response = await fetch(normalizeEndpointUrl(notificationUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Supabase-Access-Token": accessToken,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`通知送信に失敗しました。${response.status}${message ? `: ${message}` : ""}`);
  }
}
