# MarudhamX Demo Script (2 Minutes)

## Goal
Demonstrate to judges how **MarudhamX** empowers farmers to find the economically optimal transportation route by combining travel time, vehicle expenses, and produce spoilage loss.

---

### Step 1: Landing Page & Value Proposition (0:00 - 0:25)
- Open the landing page (`/`).
- Show the headline: *"AI-Powered Road Transport Optimization for Perishable Produce"*.
- Highlight the three core capabilities:
  1. Real Road Network Routing (never straight lines).
  2. Automated Fleet Allocation ($ceil(total / capacity)$).
  3. Spoilage and Economic Loss Model.
- Click **"Plan a Shipment"** (navigates smoothly to `/plan` and scrolls to top).

---

### Step 2: Input & Real-Time Truck Split (0:25 - 0:50)
- Click **"Try Demo Scenario"** (or enter: 🍅 Tomato, 5,000 kg, 3,000 kg truck capacity, Refrigerated truck).
- Show the **Truck Allocation Summary**:
  - Automatically calculates: **2 trucks required**.
  - Truck #1: 3,000 kg (100% full load).
  - Truck #2: 2,000 kg (67% partial load).
- Demonstrate Origin:
  - Click **"Pick on Map"** to drag the pickup pin.
  - Or click **"Use Current Location"** to reverse-geocode via Nominatim.
- Click **"Optimize Route"**.

---

### Step 3: Optimization Results & Map (0:50 - 1:25)
- View `/results/:shipmentId`:
  - **Leaflet Map**: Follows real road curves (NH-83 Pollachi-Coimbatore Expressway).
  - **Traffic Legend**: Shows Normal (Green), Slow (Orange), Heavy (Red), Estimated (Emerald).
  - **Recommended Route Badge**: Route A selected with score 93/100.
  - **Trade-off Explanation**:
    > *"Route A costs ₹420 more than the cheapest route, but saves ₹3,200 in spoilage loss and arrives 24 min earlier."*
  - **Why This Route?**: Visual horizontal stacked bar showing relative weights of travel time, spoilage risk, transport cost, and traffic.
  - **Comparison Table**: Clear breakdown of distance, duration, traffic delay, transport cost, expected loss, and score.
  - **Turn-by-Turn Steps**: Expandable real road instructions.
  - **Open in Google Maps**: External deep link for drivers.

---

### Step 4: Strict Tamil Localization & Settings (1:25 - 2:00)
- In the top bar, switch the language to **தமிழ்**.
- Notice:
  - Every single element transforms to pure Tamil: labels, buttons, headers, and units (கி.மீ., கிலோ, மணி, நிமி, ₹).
  - Zero English leakage!
- Visit **அமைப்புகள் (Settings)**:
  - Adjust fuel price or wholesale crop price.
  - Save and observe updated cost calculations.
- Visit **முந்தைய பதிவுகள் (History)**:
  - Show past shipments.
  - Click **Export CSV** (opens cleanly in Excel with UTF-8 BOM `\uFEFF`).
