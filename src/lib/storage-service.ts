import { supabase } from "@/lib/supabase";

const REPORT_PHOTO_BUCKET = "report-photos";

export const storageService = {
  async uploadReportPhoto(file: File, reportId: string) {
    const safeName = `${Date.now()}-${file.name.replaceAll(/\s+/g, "-")}`;
    const imagePath = `${reportId}/${safeName}`;
    const { error } = await supabase.storage.from(REPORT_PHOTO_BUCKET).upload(imagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      throw error;
    }
    return imagePath;
  },

  getPublicUrl(path: string) {
    return supabase.storage.from(REPORT_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
  },

  async removePhoto(path: string) {
    const { error } = await supabase.storage.from(REPORT_PHOTO_BUCKET).remove([path]);
    if (error) {
      throw error;
    }
  },
};
