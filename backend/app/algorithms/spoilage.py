import math

def heat_factor_from_temperature(temp_c: float) -> float:
    """Piecewise heat factor lookup based on ambient temperature."""
    if temp_c < 25.0:
        return 1.0
    elif 25.0 <= temp_c < 30.0:
        return 1.2
    elif 30.0 <= temp_c < 35.0:
        return 1.5
    else:
        return 1.8

def compute_weather_weighted_spoilage(base_spoilage_rate: float, temp_factor: float, ambient_temp_c: float, duration_hours: float) -> dict:
    """Computes weather-adjusted spoilage fraction f = 1 - e^(-k * T)."""
    heat_factor = heat_factor_from_temperature(ambient_temp_c)
    effective_k = base_spoilage_rate * temp_factor * heat_factor
    spoilage_fraction = min(0.99, round(1.0 - math.exp(-effective_k * duration_hours), 4))
    return {
        "heat_factor": heat_factor,
        "effective_k": effective_k,
        "spoilage_fraction": spoilage_fraction,
        "weather_summary": f"Weather at arrival: {round(ambient_temp_c)} °C (estimated, forecast)"
    }
