import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type GalleryPhoto = {
  id: string;
  url: string;
  name: string;
};

type PhotoGalleryDialogProps = {
  photos: GalleryPhoto[];
  openIndex: number | null;
  onOpenIndexChange: (index: number | null) => void;
};

export function PhotoGalleryDialog({ photos, openIndex, onOpenIndexChange }: PhotoGalleryDialogProps) {
  const open = openIndex !== null;
  const currentIndex = openIndex === null ? 0 : Math.min(Math.max(openIndex, 0), photos.length - 1);
  const currentPhoto = photos[currentIndex];
  const hasMultiplePhotos = photos.length > 1;

  const showPrevious = () => {
    onOpenIndexChange(currentIndex === 0 ? photos.length - 1 : currentIndex - 1);
  };

  const showNext = () => {
    onOpenIndexChange(currentIndex === photos.length - 1 ? 0 : currentIndex + 1);
  };

  useEffect(() => {
    if (!open || !hasMultiplePhotos) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, hasMultiplePhotos, open]);

  if (!currentPhoto) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => onOpenIndexChange(nextOpen ? currentIndex : null)}>
      <DialogContent className="max-w-5xl border-0 bg-black/95 text-white">
        <DialogTitle className="sr-only">写真プレビュー</DialogTitle>
        <div className="flex min-h-[55vh] flex-col gap-4">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <img src={currentPhoto.url} alt={currentPhoto.name} className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain" />
          </div>

          {hasMultiplePhotos ? (
            <div className="flex items-center justify-center gap-4">
              <Button type="button" variant="secondary" size="icon" className="rounded-full bg-white/90 text-foreground shadow-lg" onClick={showPrevious}>
                <ChevronLeft className="h-5 w-5" />
                <span className="sr-only">前の写真</span>
              </Button>
              <p className="min-w-16 text-center text-sm text-white/80">
                {currentIndex + 1} / {photos.length}
              </p>
              <Button type="button" variant="secondary" size="icon" className="rounded-full bg-white/90 text-foreground shadow-lg" onClick={showNext}>
                <ChevronRight className="h-5 w-5" />
                <span className="sr-only">次の写真</span>
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
