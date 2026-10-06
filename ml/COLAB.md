# Training on Colab

This machine has no NVIDIA GPU — only Intel Iris Xe — so `torch` here is
CPU-only and a single epoch of the multimodal model takes tens of minutes. Real
runs happen on a Colab T4.

## What you upload

`ml/colab_bundle.zip`. It is a downscaled copy of the training data plus the
code, laid out so the bundle root works as `ML_ROOT` and every path in
`wasteml/config.py` resolves without a single edit.

Rebuild it any time:

```
ml/.venv/Scripts/python ml/scripts/make_colab_bundle.py --out colab_bundle
```

Contents:

| Path | What |
|---|---|
| `data/raw/<Class>/` | classifier images, long edge capped at 320 px |
| `data/splits/` | the single-image train/val/test lists |
| `data/observations.csv` | the 10,000 records of report Table 6.1 |
| `data/obs_splits/` | observation splits for the multimodal model |
| `data/points.csv` | the 191 Bhimavaram collection points |
| `data/detection/` | YOLO images and labels, capped at 640 px |
| `wasteml/`, `scripts/` | the code, so Colab runs the same pipeline |

Originals are never modified. The script only writes into `--out`.

## Steps

1. Upload `colab_bundle.zip` to Google Drive.
2. Open `ml/colab_train.ipynb` in Colab.
3. **Runtime → Change runtime type → T4 GPU.** Do this before running anything;
   switching later restarts the session and loses the unpacked data.
4. Run the cells in order. Cell 1 confirms the GPU is actually attached — if it
   prints `False`, stop and fix the runtime rather than training on Colab's CPU,
   which is slower than this laptop.
5. Cell 2 mounts Drive and unpacks the zip to `/content/ml`.

## Which model each section trains

| Section | Trains | Reads | Roughly |
|---|---|---|---|
| 4 | single-image classifier (MobileNetV3) | `data/splits/` | 15 min |
| 5b | **multimodal model, report §6.4** | `data/obs_splits/` | 40 min |
| 6 | detector (YOLOv8n) | `data/detection/` | 50 min |

Section 5b is the new one and the one the report's Chapter 6 describes. The
single-image classifier in section 4 is the existing two-stage pipeline and is
unaffected — both models can be kept, and you need the detector either way.

If you only have time for one, run 5b.

## If it runs out of memory

Drop the batch size. Table 6.2 specifies 32; 16 changes the result very little.

```
!python -u scripts/train_multimodal.py --batch-size 16 --workers 2
```

## To check the loop before a full run

```
!python -u scripts/train_multimodal.py --epochs-head 1 --epochs-full 0 --limit-train 256
```

Two minutes, and it proves the data unpacked correctly. The scores it prints
are meaningless.

## What to bring back

Section 9 copies the artifacts to Drive. Download these into `ml/artifacts/`:

- `waste_multimodal.pt` and `waste_multimodal_metrics.json`
- `waste_mobilenet_v3_small.pt` and its metrics, if you ran section 4
- `waste_detector.pt` and `detector-metrics.json`, if you ran section 6

The metrics JSON is what the report's Chapter 8 tables are built from, so bring
it back even if you leave the weights on Drive.

## Colab will disconnect

A free session drops after roughly 90 minutes of inactivity and has a hard
limit around 12 hours. Keep the tab open and visible. If it dies mid-run the
checkpoint is lost — there is no resume — so run one section at a time and copy
its artifacts to Drive before starting the next.
