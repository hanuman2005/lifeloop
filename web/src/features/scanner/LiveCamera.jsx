// A live camera preview with a shutter, for devices where the file input's
// `capture` attribute does nothing.
//
// `<input type="file" capture="environment">` opens the camera app on a phone and is
// silently ignored on a desktop browser, which falls back to the file picker. That
// is correct per spec and confusing in practice: a button labelled "Open camera"
// opened a file dialog on a laptop. ScannerPage now picks between the two, and this
// component is the desktop half.
//
// It is deliberately not used on phones. The native camera app handles focus,
// exposure and orientation better than a getUserMedia preview does, and photo
// quality is the one thing the model actually depends on.
//
// getUserMedia needs a secure context. localhost counts; a plain-http LAN address
// does not, and the browser reports that as a permission error, which is what the
// error state below is worded for.

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const CONSTRAINTS = {
  video: {
    // `ideal` rather than `exact`: a laptop has no environment-facing camera and an
    // exact constraint would fail outright instead of using the one camera present.
    facingMode: { ideal: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
  audio: false,
};

export default function LiveCamera({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("starting"); // starting | live | error
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);

        // The component can unmount while the permission prompt is open. Without
        // this the camera light stays on with nothing to turn it off.
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus("live");
      } catch (caught) {
        if (cancelled) return;
        setStatus("error");
        setError(
          caught?.name === "NotAllowedError"
            ? "The browser blocked camera access. Allow it for this site, or use Choose a file instead."
            : caught?.name === "NotFoundError"
              ? "No camera is connected to this device. Use Choose a file instead."
              : "Could not start the camera. Use Choose a file instead.",
        );
      }
    }

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) return;

    // Stop before handing over: analysis takes a few seconds and there is no reason
    // to hold the camera open through it.
    stop();
    onCapture(new File([blob], `scan-${blob.size}.jpg`, { type: "image/jpeg" }));
  }

  if (status === "error") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="text-[14px] font-medium">Camera unavailable</div>
          <p className="max-w-sm text-[13px] text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative bg-foreground/90">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="max-h-[420px] w-full bg-black object-contain"
        />

        {status === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/85">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <span className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
              Starting camera
            </span>
          </div>
        )}
      </div>

      <CardContent className="flex items-center justify-between gap-3 py-4">
        <p className="text-[12.5px] text-muted-foreground">
          Fill the frame with the item, then capture.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={capture}
            disabled={status !== "live"}
          >
            <Camera className="mr-1.5 h-3.5 w-3.5" />
            Capture
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
