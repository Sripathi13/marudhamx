import math

def solve_observed_k(actual_loss_kg: float, total_kg: float, duration_hours: float, heat_factor: float = 1.0) -> float:
    """Solves k_observed from actual post-harvest loss fraction, travel time, and heat factor."""
    fraction = min(0.95, max(0.001, actual_loss_kg / total_kg))
    effective_hours = max(0.2, duration_hours * heat_factor)
    k_observed = -math.log(1.0 - fraction) / effective_hours
    return round(k_observed, 5)

def update_calibrated_rate(prior_k: float, k_observed: float, alpha: float = 0.2) -> float:
    """Applies exponential smoothing with alpha=0.2."""
    return round(alpha * k_observed + (1.0 - alpha) * prior_k, 5)

def evaluate_crop_calibration(crop_id: str, records: list, default_prior_k: float) -> dict:
    """Evaluates calibration respecting the 5-record threshold."""
    crop_records = [r for r in records if r["crop_id"] == crop_id]
    sample_count = len(crop_records)
    if sample_count < 5:
        return {
            "crop_id": crop_id,
            "sample_count": sample_count,
            "is_calibrated": False,
            "effective_k": default_prior_k,
            "label": f"Demonstration assumption ({sample_count}/5 records needed)"
        }
    current_k = default_prior_k
    for r in crop_records:
        current_k = update_calibrated_rate(current_k, r["k_observed"], 0.2)
    return {
        "crop_id": crop_id,
        "sample_count": sample_count,
        "is_calibrated": True,
        "effective_k": current_k,
        "label": f"Estimated, calibrated from {sample_count} actual records"
    }
