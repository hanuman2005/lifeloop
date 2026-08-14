import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export function TermsDialog({ open, onOpenChange, showAgreeButton = false, onAgree }) {
  const [numPages, setNumPages] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">RAFTTAAR Platform Terms of Use</DialogTitle>
          <DialogDescription className="sr-only">RAFTTAAR platform terms of use document</DialogDescription>
        </DialogHeader>

        <div ref={containerRef} className="flex-1 overflow-auto min-h-0">
          <Document
            file="/RAFTTAAR platform Terms of Use.pdf"
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}
            error={<div className="p-4 text-sm text-destructive">Failed to load document.</div>}
          >
            {Array.from({ length: numPages || 0 }, (_, i) => (
              <Page
                key={i + 1}
                pageNumber={i + 1}
                width={Math.max(containerWidth || 0, 600)}
                renderTextLayer
                renderAnnotationLayer={false}
                className="mb-1"
              />
            ))}
          </Document>
        </div>

        {showAgreeButton && (
          <DialogFooter className="pt-4 border-t border-border mt-2">
            <Button onClick={onAgree} className="w-full sm:w-auto">
              I Agree to Terms &amp; Conditions
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
