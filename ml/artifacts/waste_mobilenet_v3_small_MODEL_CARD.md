# Model Card — waste_mobilenet_v3_small.pt

- **Backbone:** mobilenet_v3_small (ImageNet-pretrained, fine-tuned)
- **Classes:** Plastic, Glass, Metal, Paper, Organic, Electronic, Textile, Hazardous, NotWaste
- **Input:** 224x224 RGB, ImageNet normalisation

## Test results

- Accuracy: **0.832**
- Macro-F1: **0.835**
- Expected calibration error: 0.0953 → **0.0493** after temperature scaling (T=0.714)
- Test images: 113

## Per-class

| Class | Precision | Recall | F1 | Support | Threshold |
|---|---|---|---|---|---|
| Plastic | 0.923 | 0.600 | 0.727 | 20 | 0.55 |
| Glass | 0.800 | 0.727 | 0.762 | 11 | 0.75 |
| Metal | 0.727 | 0.727 | 0.727 | 11 | 0.55 |
| Paper | 0.812 | 0.867 | 0.839 | 15 | 0.55 |
| Organic | 0.706 | 1.000 | 0.828 | 12 | 0.55 |
| Electronic | 0.889 | 1.000 | 0.941 | 16 | 0.55 |
| Textile | 0.900 | 1.000 | 0.947 | 9 | 0.55 |
| Hazardous | 0.800 | 1.000 | 0.889 | 4 | 0.55 |
| NotWaste | 0.923 | 0.800 | 0.857 | 15 | 0.55 |

## Known failure modes

- Confuses **Plastic** for **Paper** (3 test images)
- Confuses **Plastic** for **Organic** (3 test images)
- Confuses **Paper** for **Metal** (2 test images)
- Confuses **NotWaste** for **Electronic** (2 test images)
- Confuses **Metal** for **Glass** (2 test images)
- Weakest classes: Plastic (F1 0.73), Metal (F1 0.73), Glass (F1 0.76)
- Not validated on wet or heavily soiled waste beyond what the collected set contains.
- Assumes one dominant item filling the frame; multi-item photographs are out of scope.

## Abstention

| Threshold | Coverage | Accuracy on kept | Abstained |
|---|---|---|---|
| 0.00 | 1.000 | 0.832 | 0 |
| 0.30 | 1.000 | 0.832 | 0 |
| 0.40 | 0.974 | 0.855 | 3 |
| 0.50 | 0.929 | 0.876 | 8 |
| 0.55 | 0.876 | 0.899 | 14 |
| 0.60 | 0.850 | 0.906 | 17 |
| 0.70 | 0.823 | 0.914 | 20 |
| 0.80 | 0.743 | 0.964 | 29 |
| 0.90 | 0.584 | 0.985 | 47 |

## Data

Split group-disjoint by `object_id`: every photograph of one physical object is
confined to a single split, so the test score is not inflated by near-duplicates.
