export interface ColdChainBreakEvenResult {
  load_kg: number;
  wholesale_price_per_kg: number;
  spoilage_open_truck: number;
  spoilage_reefer_truck: number;
  expected_loss_open_inr: number;
  expected_loss_reefer_inr: number;
  spoilage_savings_inr: number;
  extra_reefer_cost_inr: number;
  net_benefit_inr: number;
  pays_off: boolean;
  verdict_note: {
    en: string;
    ta: string;
    hi: string;
  };
}

/**
 * Cold-chain break-even calculator:
 * saving = Q * p * (f_open - f_reefer)
 * The trip pays off when saving >= extra_cost_inr.
 */
export function refrigerationBreakEven(
  loadKg: number,
  wholesalePricePerKg: number,
  fOpen: number,
  fReefer: number,
  extraCostInr: number
): ColdChainBreakEvenResult {
  const expected_loss_open_inr = Math.round(loadKg * wholesalePricePerKg * fOpen);
  const expected_loss_reefer_inr = Math.round(loadKg * wholesalePricePerKg * fReefer);
  const spoilage_savings_inr = Math.round(loadKg * wholesalePricePerKg * (fOpen - fReefer));
  const net_benefit_inr = spoilage_savings_inr - extraCostInr;
  const pays_off = spoilage_savings_inr >= extraCostInr;

  const verdict_note = {
    en: pays_off
      ? `Refrigeration pays off on this trip: Prevents ₹${spoilage_savings_inr.toLocaleString()} in spoiled produce against an extra rental cost of ₹${extraCostInr.toLocaleString()}, yielding a net gain of +₹${net_benefit_inr.toLocaleString()} (estimated).`
      : `Refrigeration does not pay off on this trip: Spoilage prevention of ₹${spoilage_savings_inr.toLocaleString()} is less than the extra refrigeration cost of ₹${extraCostInr.toLocaleString()} (net difference: -₹${Math.abs(net_benefit_inr).toLocaleString()}). An open truck with tarp is more economical.`,
    ta: pays_off
      ? `இப்பயணத்தில் குளிரூட்டல் பலனளிக்கிறது: ₹${extraCostInr.toLocaleString()} கூடுதல் வாடகைக்கு எதிராக ₹${spoilage_savings_inr.toLocaleString()} மதிப்புள்ள அழுகலைத் தடுத்து, நிகரமாக +₹${net_benefit_inr.toLocaleString()} லாபம் தருகிறது (கணிக்கப்பட்டது).`
      : `இப்பயணத்தில் குளிரூட்டல் கூடுதல் செலவாகும்: ₹${extraCostInr.toLocaleString()} குளிரூட்டல் செலவை விட சேமிப்பு ₹${spoilage_savings_inr.toLocaleString()} குறைவு (-₹${Math.abs(net_benefit_inr).toLocaleString()}). திறந்தவெளி லாரியே பொருளாதார ரீதியாக சிறந்தது.`,
    hi: pays_off
      ? `इस यात्रा पर रेफ्रिजरेशन फायदेमंद है: ₹${extraCostInr.toLocaleString()} अतिरिक्त किराए की तुलना में ₹${spoilage_savings_inr.toLocaleString()} मूल्य की उपज खराब होने से बचाता है (+₹${net_benefit_inr.toLocaleString()} शुद्ध लाभ)।`
      : `इस यात्रा पर रेफ्रिजरेशन फायदेमंद नहीं है: ₹${extraCostInr.toLocaleString()} की लागत की तुलना में ₹${spoilage_savings_inr.toLocaleString()} की बचत कम है। सामान्य तिरपाल वाला ट्रक अधिक किफायती है।`
  };

  return {
    load_kg: loadKg,
    wholesale_price_per_kg: wholesalePricePerKg,
    spoilage_open_truck: fOpen,
    spoilage_reefer_truck: fReefer,
    expected_loss_open_inr,
    expected_loss_reefer_inr,
    spoilage_savings_inr,
    extra_reefer_cost_inr: extraCostInr,
    net_benefit_inr,
    pays_off,
    verdict_note
  };
}
