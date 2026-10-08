def rank_markets_by_net_value(evaluations: list) -> list:
    """Ranks candidate mandi destinations by net farmer profit: Net = Q * p * (1 - f) - Transport."""
    for item in evaluations:
        item["gross_value_inr"] = round(item["total_kg"] * item["price_per_kg"])
        item["spoilage_loss_inr"] = round(item["gross_value_inr"] * item["spoilage_fraction"])
        item["net_value_inr"] = round(item["total_kg"] * item["price_per_kg"] * (1 - item["spoilage_fraction"]) - item["transport_cost_inr"])
    
    evaluations.sort(key=lambda x: x["net_value_inr"], reverse=True)
    for idx, item in enumerate(evaluations):
        item["rank"] = idx + 1
    return evaluations
