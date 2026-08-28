# Model Card — waste_mobilenet_v3_small.pt

- **Backbone:** mobilenet_v3_small (ImageNet-pretrained, fine-tuned)
- **Classes:** Plastic, Glass, Metal, Paper, Organic, Electronic, Textile, Hazardous, NotWaste
- **Input:** 224x224 RGB, ImageNet normalisation

## Test results

- Accuracy: **0.848**
- Macro-F1: **0.835**
- Expected calibration error: 0.0732 → **0.0182** after temperature scaling (T=0.781)
- Test images: 454

## Per-class

| Class | Precision | Recall | F1 | Support | Threshold |
|---|---|---|---|---|---|
| Plastic | 0.846 | 0.795 | 0.820 | 83 | 0.55 |
| Glass | 0.793 | 0.920 | 0.852 | 50 | 0.55 |
| Metal | 0.725 | 0.848 | 0.781 | 59 | 0.55 |
| Paper | 0.922 | 0.797 | 0.855 | 59 | 0.55 |
| Organic | 0.914 | 0.964 | 0.938 | 55 | 0.55 |
| Electronic | 0.800 | 0.952 | 0.870 | 21 | 0.55 |
| Textile | 0.941 | 0.857 | 0.897 | 56 | 0.55 |
| Hazardous | 0.898 | 0.880 | 0.889 | 50 | 0.55 |
| NotWaste | 0.733 | 0.524 | 0.611 | 21 | 0.55 |

## Known failure modes

- Confuses **Plastic** for **Glass** (8 test images)
- Confuses **Plastic** for **Metal** (6 test images)
- Confuses **Paper** for **Plastic** (5 test images)
- Confuses **NotWaste** for **Organic** (4 test images)
- Confuses **Metal** for **Plastic** (4 test images)
- Weakest classes: NotWaste (F1 0.61), Metal (F1 0.78), Plastic (F1 0.82)
- Not validated on wet or heavily soiled waste beyond what the collected set contains.
- Assumes one dominant item filling the frame; multi-item photographs are out of scope.

## Abstention

| Threshold | Coverage | Accuracy on kept | Abstained |
|---|---|---|---|
| 0.00 | 1.000 | 0.848 | 0 |
| 0.30 | 0.996 | 0.852 | 2 |
| 0.40 | 0.971 | 0.862 | 13 |
| 0.50 | 0.894 | 0.894 | 48 |
| 0.55 | 0.868 | 0.909 | 60 |
| 0.60 | 0.835 | 0.916 | 75 |
| 0.70 | 0.771 | 0.940 | 104 |
| 0.80 | 0.700 | 0.959 | 136 |
| 0.90 | 0.582 | 0.977 | 190 |

## Data

Split group-disjoint by `object_id`: every photograph of one physical object is
confined to a single split, so the test score is not inflated by near-duplicates.
