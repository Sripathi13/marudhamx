import math

def plan_group_shipment(farms: list, truck_capacity_kg: float, base_cost_per_truck: float = 3200.0) -> dict:
    """Plans multi-farm consolidated pickup and load share cost allocation."""
    total_produce_kg = sum(f["quantity_kg"] for f in farms)
    standalone_trucks = sum(math.ceil(f["quantity_kg"] / truck_capacity_kg) for f in farms)
    consolidated_trucks = max(1, math.ceil(total_produce_kg / truck_capacity_kg))
    
    total_standalone_cost = standalone_trucks * base_cost_per_truck
    total_shared_cost = consolidated_trucks * base_cost_per_truck
    savings = total_standalone_cost - total_shared_cost
    
    return {
        "total_produce_kg": total_produce_kg,
        "consolidated_trucks": consolidated_trucks,
        "standalone_trucks": standalone_trucks,
        "trucks_saved": standalone_trucks - consolidated_trucks,
        "total_shared_cost": total_shared_cost,
        "total_savings": savings
    }
