import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { imgUrl } from "@/lib/utils";

interface CvViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cvUrl: string;
  userName?: string;
}

export function CvViewerDialog({ open, onOpenChange, cvUrl, userName }: CvViewerDialogProps) {
  const normalizedUrl = imgUrl(cvUrl)!;
  const isPdf = normalizedUrl.toLowerCase().includes(".pdf");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center justify-between gap-4 pr-8">
            <span className="truncate">CV {userName ? `de ${userName}` : ""}</span>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" asChild>
                <a href={normalizedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" /> Abrir
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={normalizedUrl} download>
                  <Download className="w-4 h-4 mr-1" /> Descargar
                </a>
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 px-6 pb-6">
          {isPdf ? (
            <iframe
              src={normalizedUrl}
              className="w-full h-full rounded-lg border"
              title={`CV ${userName || ""}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Vista previa no disponible para este formato
                </p>
                <Button asChild>
                  <a href={normalizedUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" /> Abrir en nueva pestaña
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
