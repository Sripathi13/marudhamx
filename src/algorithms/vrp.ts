export interface FarmPickupRequest {
  id: string;
  farm_name: string;
  farmer_name: string;
  contact_phone?: string;
  crop_id: string;
  crop_name: { en: string; ta: string; hi: string };
  quantity_kg: number;
  lat: number;
  lng: number;
}

export interface GroupTruckAllocation {
  truck_index: number;
  capacity_kg: number;
  total_load_kg: number;
  utilization_percent: number;
  pickups: Array<{
    farm_id: string;
    farm_name: string;
    farmer_name: string;
    crop_id: string;
    quantity_kg: number;
    stop_sequence: number;
    cost_share_inr: number;
    standalone_cost_inr: number;
    savings_inr: number;
  }>;
  stop_order: string[];
  total_truck_cost_inr: number;
}

export interface GroupShipmentPlanResult {
  total_produce_kg: number;
  truck_capacity_kg: number;
  trucks_needed: number;
  standalone_trucks_needed: number;
  trucks_saved: number;
  total_shared_cost_inr: number;
  total_standalone_cost_inr: number;
  total_savings_inr: number;
  average_saving_per_farm_inr: number;
  trucks: GroupTruckAllocation[];
  summary_reason: {
    en: string;
    ta: string;
    hi: string;
  };
}

/**
 * Plans consolidated group shipment with VRP heuristic and fair load-share cost allocation.
 */
export function planGroupShipment(
  farms: FarmPickupRequest[],
  truckCapacityKg: number,
  baseCostPerTruck = 3200
): GroupShipmentPlanResult {
  const total_produce_kg = farms.reduce((acc, f) => acc + f.quantity_kg, 0);

  // Standalone: if every farm hired their own truck(s)
  let total_standalone_cost_inr = 0;
  let standalone_trucks_needed = 0;
  const farmStandaloneCosts: Record<string, number> = {};

  farms.forEach((f) => {
    const trucksForFarm = Math.ceil(f.quantity_kg / truckCapacityKg);
    standalone_trucks_needed += trucksForFarm;
    const cost = trucksForFarm * baseCostPerTruck;
    farmStandaloneCosts[f.id] = cost;
    total_standalone_cost_inr += cost;
  });

  // Consolidated packing (First Fit Decreasing heuristic)
  const sortedFarms = [...farms].sort((a, b) => b.quantity_kg - a.quantity_kg);
  const trucks: GroupTruckAllocation[] = [];

  let currentTruckIndex = 1;
  let currentTruckLoad = 0;
  let currentTruckFarms: Array<{ farm: FarmPickupRequest; load: number }> = [];

  for (const f of sortedFarms) {
    let remainingToPack = f.quantity_kg;
    while (remainingToPack > 0) {
      const spaceAvailable = truckCapacityKg - currentTruckLoad;
      if (spaceAvailable <= 0) {
        // Close current truck
        closeTruck();
        currentTruckIndex++;
        currentTruckLoad = 0;
        currentTruckFarms = [];
      }

      const canFit = Math.min(remainingToPack, truckCapacityKg - currentTruckLoad);
      currentTruckFarms.push({ farm: f, load: canFit });
      currentTruckLoad += canFit;
      remainingToPack -= canFit;
    }
  }

  function closeTruck() {
    if (currentTruckFarms.length === 0) return;
    const truckCost = baseCostPerTruck;
    const truckLoad = currentTruckFarms.reduce((acc, item) => acc + item.load, 0);

    const pickups = currentTruckFarms.map((item, idx) => {
      // Split cost by load share
      const share = item.load / truckLoad;
      const cost_share_inr = Math.round(truckCost * share);
      const standalone = farmStandaloneCosts[item.farm.id] || baseCostPerTruck;
      const savings = Math.max(0, standalone - cost_share_inr);

      return {
        farm_id: item.farm.id,
        farm_name: item.farm.farm_name,
        farmer_name: item.farm.farmer_name,
        crop_id: item.farm.crop_id,
        quantity_kg: item.load,
        stop_sequence: idx + 1,
        cost_share_inr,
        standalone_cost_inr: standalone,
        savings_inr: savings
      };
    });

    // Ensure sum of cost_share_inr equals truckCost exactly
    const allocatedSum = pickups.reduce((acc, p) => acc + p.cost_share_inr, 0);
    const diff = truckCost - allocatedSum;
    if (diff !== 0 && pickups.length > 0) {
      pickups[0].cost_share_inr += diff;
    }

    trucks.push({
      truck_index: currentTruckIndex,
      capacity_kg: truckCapacityKg,
      total_load_kg: truckLoad,
      utilization_percent: Math.round((truckLoad / truckCapacityKg) * 100),
      pickups,
      stop_order: pickups.map((p) => p.farm_name),
      total_truck_cost_inr: truckCost
    });
  }

  if (currentTruckFarms.length > 0) {
    closeTruck();
  }

  const trucks_needed = trucks.length;
  const trucks_saved = Math.max(0, standalone_trucks_needed - trucks_needed);
  const total_shared_cost_inr = trucks.reduce((acc, t) => acc + t.total_truck_cost_inr, 0);
  const total_savings_inr = Math.max(0, total_standalone_cost_inr - total_shared_cost_inr);
  const average_saving_per_farm_inr = farms.length > 0 ? Math.round(total_savings_inr / farms.length) : 0;

  const summary_reason = {
    en: `Consolidating ${farms.length} farm loads reduces total trucks from ${standalone_trucks_needed} to ${trucks_needed}, saving a total of ₹${total_savings_inr.toLocaleString()} (~₹${average_saving_per_farm_inr.toLocaleString()} per farm estimated).`,
    ta: `${farms.length} பண்ணை சுமைகளை ஒருங்கிணைப்பது லாரிகளின் எண்ணிக்கையை ${standalone_trucks_needed}-லிருந்து ${trucks_needed}-ஆகக் குறைத்து, மொத்தம் ₹${total_savings_inr.toLocaleString()} (ஒரு பண்ணைக்கு ~₹${average_saving_per_farm_inr.toLocaleString()} கணிக்கப்பட்டது) சேமிக்கிறது.`,
    hi: `${farms.length} खेतों की उपज को समूहित करने से कुल ट्रक ${standalone_trucks_needed} से घटकर ${trucks_needed} हो जाते हैं, जिससे कुल ₹${total_savings_inr.toLocaleString()} की बचत होती है (प्रति खेत लगभग ₹${average_saving_per_farm_inr.toLocaleString()} अनुमानित)।`
  };

  return {
    total_produce_kg,
    truck_capacity_kg: truckCapacityKg,
    trucks_needed,
    standalone_trucks_needed,
    trucks_saved,
    total_shared_cost_inr,
    total_standalone_cost_inr,
    total_savings_inr,
    average_saving_per_farm_inr,
    trucks,
    summary_reason
  };
}
