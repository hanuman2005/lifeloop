# Route Optimisation Study

Fixed circuit over 100 bins: **32.30 km**, driven regardless of fill state.

| Fill rate | Mean stops | Fixed circuit | Optimised | Reduction | Range |
|---|---|---|---|---|---|
| 10% | 9.1 | 32.3 km | 15.26 km | **52.8%** | 38.4% – 65.8% |
| 20% | 19.9 | 32.3 km | 19.06 km | **41%** | 30.3% – 56% |
| 30% | 30.4 | 32.3 km | 23.17 km | **28.3%** | 14.2% – 43.5% |
| 40% | 39.7 | 32.3 km | 25.34 km | **21.6%** | 11.2% – 26.7% |
| 50% | 49.6 | 32.3 km | 27.49 km | **14.9%** | 0.8% – 25.1% |
| 60% | 59.7 | 32.3 km | 31.14 km | **3.6%** | -9.7% – 10.9% |
| 80% | 80.6 | 32.3 km | 37.68 km | **-16.6%** | -27.4% – -3.2% |
| 100% | 100 | 32.3 km | 38.82 km | **-20.2%** | -32.8% – -17.2% |

At realistic fill rates (20–50%), mean reduction is **26.5%**.

## Finding

Crowd-sensed routing wins precisely when bins are not uniformly full, which is the real-world case. Above roughly 60% fill the fixed circuit is better, because there is nothing left to skip. Reporting that crossover is what makes the headline figure credible.

## Baseline

Fixed circuit over every bin, ordered by nearest-neighbour + 2-opt, driven regardless of fill state.

The baseline is deliberately strong: the circuit is ordered with the same
nearest-neighbour and 2-opt heuristics the optimised arm uses. Any saving
therefore comes from skipping bins that did not need emptying, not from
giving the baseline a poor route.

## Limitations

- Straight-line haversine distance, not road network distance. Both arms are penalised equally, so the ratio is defensible but the absolute kilometres are not.
- The optimised arm splits stops into capacity-limited routes of 25, each returning to the depot, while the baseline is a single tour. Above roughly 60% fill this asymmetry is what makes the optimised total longer: several depot returns cost more than one circuit. This is realistic for a fleet with limited capacity, but it means the crossover point is a property of the capacity assumption, not only of the routing.
- No time windows or traffic modelling.
- Bin locations are synthetic, drawn over the pilot area geometry.
