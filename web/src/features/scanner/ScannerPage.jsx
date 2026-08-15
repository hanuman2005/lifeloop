// M1 — the waste scanner.
//
// Uses a file input with `capture` rather than getUserMedia. On a phone that opens
// the native camera, which handles focus, exposure and orientation far better than
// anything we would build, and it degrades to a file picker on desktop with no
// extra code.

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Camera, Layers, Loader2, RotateCcw, ScanLine, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ecoAPI, errorMessage, scanAPI, wasteAnalysisAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import MaterialResult from "@/features/scanner/MaterialResult";
import SceneResult from "@/features/scanner/SceneResult";
import { MATERIAL_GUIDE } from "@/features/scanner/materials";

/** Strips the `data:image/jpeg;base64,` prefix the API does not want. */
function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.readAsDataURL(file);
  });
}

/**
 * Large photos are slow to upload on mobile data and the model only sees 224x224
 * anyway, so downscale before sending. Saves several seconds per scan in the field.
 */
async function downscale(file, maxEdge = 1024, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));

  if (scale === 1) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  return blob || file;
}

export default function ScannerPage() {
  const navigate = useNavigate();
  const cameraInput = useRef(null);
  const fileInput = useRef(null);

  const [preview, setPreview] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState(null);
  const [scene, setScene] = useState(null);
  const [noItem, setNoItem] = useState(false);
  // "single" is one item filling the frame, which is the citizen case. "pile"
  // segregates a mixed heap, which is what a municipality photographs.
  const [mode, setMode] = useState("single");

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setResult(null);
    setScene(null);
    setNoItem(false);
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    // Clear immediately so picking the same file twice still fires onChange.
    event.target.value = "";
    if (!file) return;

    reset();
    setPreview(URL.createObjectURL(file));
    setAnalysing(true);

    try {
      const compact = await downscale(file);
      const base64 = await readAsBase64(compact);

      if (mode === "pile") {
        const { data: sceneData } = await scanAPI.analyzeScene(base64);
        if (!sceneData.success) throw new Error(sceneData.message || "Scene analysis failed");
        setScene(sceneData);
        return;
      }

      const { data } = await scanAPI.analyzeImage(base64);

      // The model has a dedicated NotWaste class, so this is a real prediction
      // rather than something inferred from a low score.
      if (data.noItem) {
        setNoItem(true);
        return;
      }

      if (!data.success || !data.analysis) {
        throw new Error("The classifier returned no result");
      }

      setResult(data.analysis);

      // Persist the analysis so it appears in history and feeds community stats.
      // Fire-and-forget for the same reason as the points call: the result is
      // already on screen and a storage failure must not retract it.
      try {
        await wasteAnalysisAPI.save({
          tfLabel: data.analysis.label || data.analysis.material,
          confidence: Number(data.analysis.confidence) || 0,
          material: data.analysis.material,
          recyclingGuidance: MATERIAL_GUIDE[data.analysis.material]?.disposal,
          reuseIdeas: MATERIAL_GUIDE[data.analysis.material]?.reuse || [],
          donationPossible: Boolean(data.analysis.donationPossible),
          // The model's enum is mobile | tablet | desktop, so report which of
          // those this browser actually is rather than inventing a "web" value.
          deviceType: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
        });
      } catch {
        // Silent by design.
      }

      // Points are a side effect; a failure here must not lose the scan result.
      try {
        await ecoAPI.award({
          action: "scan",
          description: `Scanned: ${data.analysis.material}`,
          itemLabel: data.analysis.label || data.analysis.material,
          category: data.analysis.material,
          metadata: { confidence: data.analysis.confidence },
        });
      } catch {
        // Silent by design — surfacing it would imply the scan failed.
      }
    } catch (error) {
      toast.error(errorMessage(error, "Could not analyse the image"));
      reset();
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Scan an item</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Photograph one item filling the frame. We will tell you what it is made of and
            what to do with it.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/scan/history")}>
          History
        </Button>
      </header>

      <div className="flex gap-1.5">
        {[
          { value: "single", label: "One item", icon: ScanLine },
          { value: "pile", label: "Mixed pile", icon: Layers },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => { setMode(option.value); reset(); }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium transition-colors",
              mode === option.value
                ? "border-accent bg-accent-tint text-accent"
                : "border-border hover:bg-secondary",
            )}
          >
            <option.icon className="h-4 w-4" />
            {option.label}
          </button>
        ))}
      </div>

      <p className="-mt-2 text-[12.5px] text-muted-foreground">
        {mode === "single"
          ? "One item filling the frame."
          : "Several items together — each is found and identified separately."}
      </p>

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {!preview && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[14.5px] font-medium">Take a photo of the item</div>
              <div className="mt-1 text-[13px] text-muted-foreground">
                One item, filling the frame, good light
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => cameraInput.current?.click()}>
                <Camera className="mr-2 h-4 w-4" />
                Open camera
              </Button>
              <Button variant="outline" onClick={() => fileInput.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Choose a file
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {preview && (
        <Card className="overflow-hidden">
          <div className="relative bg-muted">
            <img src={preview} alt="Item being analysed" className="max-h-[340px] w-full object-contain" />
            {analysing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
                <span className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
                  Analysing
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {noItem && (
        <Card className="border-border">
          <CardContent className="flex items-start gap-3 py-5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-[14px] font-medium">No item detected</div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                The photo does not appear to contain a discardable item. Point the camera at a
                single item so it fills most of the frame.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {scene && (
        <SceneResult imageUrl={preview} result={scene} onScanAnother={reset} />
      )}

      {result && (
        <MaterialResult
          analysis={result}
          guide={MATERIAL_GUIDE[result.material]}
          onScanAnother={reset}
          onCreateListing={() =>
            navigate("/listings/new", {
              state: { material: result.material, label: result.label },
            })
          }
        />
      )}
    </div>
  );
}
