# Model Card — waste_mobilenet_v3_small.pt

- **Backbone:** mobilenet_v3_small (ImageNet-pretrained, fine-tuned)
- **Classes:** Plastic, Glass, Metal, Paper, Organic, Textile, Hazardous
- **Input:** 224x224 RGB, ImageNet normalisation

## Test results

- Accuracy: **0.842**
- Macro-F1: **0.841**
- Expected calibration error: 0.1596 → **0.1021** after temperature scaling (T=0.703)
- Test images: 82

## Per-class

| Class | Precision | Recall | F1 | Support | Threshold |
|---|---|---|---|---|---|
| Plastic | 1.000 | 0.800 | 0.889 | 20 | 0.55 |
| Glass | 0.692 | 0.750 | 0.720 | 12 | 0.55 |
| Metal | 0.733 | 0.917 | 0.815 | 12 | 0.55 |
| Paper | 0.818 | 0.643 | 0.720 | 14 | 0.55 |
| Organic | 1.000 | 1.000 | 1.000 | 12 | 0.55 |
| Textile | 0.889 | 1.000 | 0.941 | 8 | 0.55 |
| Hazardous | 0.667 | 1.000 | 0.800 | 4 | 0.55 |

## Known failure modes

- Confuses **Paper** for **Glass** (3 test images)
- Confuses **Plastic** for **Paper** (2 test images)
- Confuses **Paper** for **Metal** (2 test images)
- Confuses **Plastic** for **Metal** (1 test images)
- Confuses **Plastic** for **Glass** (1 test images)
- Weakest classes: Glass (F1 0.72), Paper (F1 0.72), Hazardous (F1 0.80)
- Not validated on wet or heavily soiled waste beyond what the collected set contains.
- Assumes one dominant item filling the frame; multi-item photographs are out of scope.

## Abstention

| Threshold | Coverage | Accuracy on kept | Abstained |
|---|---|---|---|
| 0.00 | 1.000 | 0.842 | 0 |
| 0.30 | 0.988 | 0.852 | 1 |
| 0.40 | 0.951 | 0.859 | 4 |
| 0.50 | 0.902 | 0.892 | 8 |
| 0.55 | 0.842 | 0.942 | 13 |
| 0.60 | 0.768 | 0.984 | 19 |
| 0.70 | 0.720 | 0.983 | 23 |
| 0.80 | 0.622 | 0.980 | 31 |
| 0.90 | 0.549 | 0.978 | 37 |

## Data

Split group-disjoint by `object_id`: every photograph of one physical object is
confined to a single split, so the test score is not inflated by near-duplicates.
