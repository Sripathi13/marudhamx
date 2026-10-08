def refrigeration_break_even(load_kg: float, price_per_kg: float, f_open: float, f_reefer: float, extra_cost_inr: float) -> dict:
    """Calculates whether refrigeration investment breaks even based on spoilage savings."""
    saving = round(load_kg * price_per_kg * (f_open - f_reefer))
    net_benefit = saving - extra_cost_inr
    pays_off = saving >= extra_cost_inr
    return {
        "load_kg": load_kg,
        "price_per_kg": price_per_kg,
        "spoilage_savings_inr": saving,
        "extra_reefer_cost_inr": extra_cost_inr,
        "net_benefit_inr": net_benefit,
        "pays_off": pays_off
    }
