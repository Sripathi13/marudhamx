# MarudhamX (மருதம்எக்ஸ்) - AI-Based Perishable Produce Transportation Optimizer

**MarudhamX** is an intelligent agricultural logistics and transportation optimizer that calculates the economically optimal road route for moving perishable produce from farm to market. Rather than relying on simple shortest-path heuristics, MarudhamX minimizes **Total Economic Cost**:
$$\text{Total Economic Cost} = \text{Transport Cost} + \text{Expected Spoilage Loss}$$

---

## Architecture Diagram

```
                 +---------------------------------------------+
                 |          React + Vite + TypeScript          |
                 |     (Tailwind CSS, i18next, Leaflet.js)     |
                 +----------------------+----------------------+
                                        |  REST API / JSON
                                        v
                 +---------------------------------------------+
                 |              Express Backend                |
                 |                 (server.ts)                 |
                 +----+------------------+---------------------+
                      |                  |
           +----------v--------+   +-----v---------------------+
           |    Routing Engine |   | Agricultural Cost Engine  |
           |   OSRM / Google   |   |   - Spoilage Decay        |
           | Real Road Network |   |   - Truck Allocation      |
           +-------------------+   |   - Multi-Criteria Scoring|
                                   +---------------------------+
```

---

## Key Features

1. **Strict Multilingual Localization (Tamil, English, Hindi)**:
   - Zero English leakage in Tamil mode (`ta`). Every button, label, unit (கி.மீ., கிலோ, மணி, நிமி, ₹), table header, and tooltip is localized.
   - Preserves state and persists in `localStorage` across reloads.
2. **Automated Fleet Capacity Split**:
   - Computes required trucks: $\lceil \text{total\_kg} / \text{capacity\_kg} \rceil$.
   - Displays real-time breakdown of full and partial loads with utilization percentages.
3. **Real Road Network Routing**:
   - Queries OSRM road geometry (`/route/v1/driving/`) with alternative routes and regional waypoints (Pollachi, Kinathukadavu, Tiruppur, Salem, Erode).
   - Never draws straight lines or approximate diagonals.
4. **Traffic Visualization & Honest Data Transparency**:
   - Route segments styled with distinct color codes and patterns:
     - Normal traffic: Solid green
     - Slow traffic: Solid orange
     - Heavy traffic: Solid red
     - Estimated / Typical: Solid emerald or dashed grey
   - Displays an estimated banner and delay metrics when live API keys are not supplied.
5. **Agricultural Cost & Spoilage Model**:
   - $k = \text{base\_spoilage\_rate} \times \text{temp\_factor} \times \text{heat\_factor}$
   - $\text{Spoilage Fraction} = 1 - e^{-k \times t_{\text{hours}}}$
   - $\text{Expected Loss} = \text{Quantity} \times \text{Wholesale Price} \times \text{Spoilage Fraction}$
6. **Multi-Criteria Route Scoring & Trade-Off Analysis**:
   - Normalizes time, cost, loss, and traffic.
   - Generates a human-readable one-sentence trade-off comparison.
7. **CSV Export with UTF-8 BOM**:
   - Exports historical records with localized headers that display correctly in Excel.

---

## Assumptions Table

| Parameter | Demonstration Assumption Value | Description |
|---|---|---|
| Tomato Base Spoilage Rate | 0.045 / hour | Exponential perishability decay constant |
| Leafy Vegetables Spoilage Rate | 0.065 / hour | Highly perishable greens |
| Banana Base Spoilage Rate | 0.025 / hour | Medium perishability |
| Potato Base Spoilage Rate | 0.012 / hour | Lower decay rate |
| Rice / Paddy Spoilage Rate | 0.002 / hour | Grain with negligible short-haul spoilage |
| Refrigerated Truck Temp Factor | 0.3 | 70% reduction in spoilage rate |
| Closed Truck Temp Factor | 0.7 | 30% reduction in spoilage rate |
| Open Truck Temp Factor | 1.0 | Baseline ambient sun exposure |
| Diesel Fuel Price | ₹98.50 / litre | Editable in Settings |
| Driver Allowance | ₹450 / truck | Base haul allowance |

*Note: Spoilage rates and traffic projections are mathematical models for decision support and demonstration.*

---

## Limitations and Next Steps

- **Live Traffic Data**: Default setup uses OSRM with empirical time-of-day traffic multipliers. Supplying `GOOGLE_MAPS_API_KEY` enables live route intervals.
- **Spoilage Calibration**: Perishability decay rates are heuristic demonstration values and should be calibrated against agricultural university research.
- **Multi-stop Routing (VRP)**: Future iterations can expand multi-farm pickup milk runs using OR-Tools.
