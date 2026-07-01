const uploadUrl = import.meta.env.VITE_FILE_UPLOAD_URL;
const deleteUrl = import.meta.env.VITE_FILE_DELETE_URL;
const apiToken = import.meta.env.VITE_FILE_API_TOKEN;

type UploadResponse = {
  url?: string;
};

function buildHeaders() {
  const headers: Record<string, string> = {};
  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`;
  }
  return headers;
}

export const storageService = {
  async uploadReportPhoto(file: File, reportId: string) {
    if (!uploadUrl) {
      throw new Error("VITE_FILE_UPLOAD_URL is missing.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("reportId", reportId);

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: buildHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(`画像アップロードに失敗しました。${response.status}${message ? `: ${message}` : ""}`);
    }

    const data = (await response.json()) as UploadResponse;
    if (!data.url) {
      throw new Error("アップロードAPIのレスポンスにurlがありません。");
    }

    return data.url;
  },

  getPublicUrl(url: string) {
    return url;
  },

  async removePhoto(url: string) {
    if (!deleteUrl) {
      return;
    }

    const response = await fetch(deleteUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildHeaders(),
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error("画像削除に失敗しました。");
    }
  },
};
