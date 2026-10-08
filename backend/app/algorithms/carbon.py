def calculate_carbon_estimate(distance_km: float, fuel_efficiency_kmpl: float, trucks_needed: int, baseline_distance_km: float, emission_factor: float = 2.68) -> dict:
    """Calculates fuel litres and estimated diesel CO2 emissions."""
    fuel_litres = round((distance_km / fuel_efficiency_kmpl) * trucks_needed, 1)
    co2_kg = round(fuel_litres * emission_factor, 1)
    baseline_litres = round((baseline_distance_km / fuel_efficiency_kmpl) * trucks_needed, 1)
    baseline_co2 = round(baseline_litres * emission_factor, 1)
    return {
        "fuel_litres": fuel_litres,
        "co2_kg": co2_kg,
        "baseline_difference_co2_kg": round(co2_kg - baseline_co2, 1),
        "is_estimated": True
    }
