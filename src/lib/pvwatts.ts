import { z } from "zod";

const PVWattsInputsSchema = z.object({
  system_capacity: z.number().min(0.05).max(500000),
  module_type: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0), // Standard, Premium, Thin film
  losses: z.number().min(-5).max(100).default(14),
  array_type: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(1), // Fixed open rack, fixed roof mount, 1-axis, 1-axis backtracked, 2-axis
  tilt: z.number().min(0).max(90),
  azimuth: z.number().min(0).max(360).default(180), // South-facing
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  radius: z.number().default(0), // Search radius for weather station
  dataset: z.literal("NSRDB").default("NSRDB"),
  tmy: z.string().optional(), // Use TMY2/3 data if specified
});

export type PVWattsInputs = z.infer<typeof PVWattsInputsSchema>;

export interface PVWattsOutputs {
  ac_monthly: number[];
  ac_annual: number;
  solrad_monthly: number[];
  solrad_annual: number;
  poa_monthly: number[];
  dc_monthly: number[];
  ac_dc_ratio: number;
}

/**
 * Fetches solar production data from the NREL PVWatts V8 API.
 * @param params The validated input parameters for the PVWatts API call.
 * @returns A promise that resolves to the API output.
 */
export async function getPVWattsProduction(params: PVWattsInputs): Promise<PVWattsOutputs> {
  const apiKey = process.env.NREL_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  NREL_API_KEY not set - using estimated solar production");
    // Return fallback estimated production based on system size and location
    // Using industry standard of ~1,200 kWh per kW per year for US average
    const annualKwhPerKw = 1200;
    const systemCapacityKw = params.system_capacity / 1000;
    const estimatedAnnual = systemCapacityKw * annualKwhPerKw;
    const monthlyAvg = estimatedAnnual / 12;
    
    return {
      ac_annual: estimatedAnnual,
      ac_monthly: Array(12).fill(monthlyAvg),
      solrad_monthly: Array(12).fill(5),
      solrad_annual: 60,
      poa_monthly: Array(12).fill(monthlyAvg * 1.1),
      dc_monthly: Array(12).fill(monthlyAvg * 1.15),
      ac_dc_ratio: 0.77,
    };
  }

  // Validate inputs with Zod
  const validatedParams = PVWattsInputsSchema.parse(params);

  const url = new URL("https://developer.nrel.gov/api/pvwatts/v8.json");
  url.searchParams.append("api_key", apiKey);

  // Append all validated parameters to the URL
  for (const [key, value] of Object.entries(validatedParams)) {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  }

  console.log(`Fetching PVWatts data for lat: ${validatedParams.lat}, lon: ${validatedParams.lon}`);

  try {
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("PVWatts API Error Response:", errorBody);
      throw new Error(`PVWatts API request failed with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      console.error("PVWatts API returned errors:", data.errors);
      throw new Error(`PVWatts API Error: ${data.errors.join(", ")}`);
    }

    console.log(`Successfully fetched PVWatts data. Annual AC output: ${data.outputs.ac_annual} kWh`);
    
    return data.outputs as PVWattsOutputs;

  } catch (error) {
    console.error("Error fetching data from PVWatts API:", error);
    throw error; // Re-throw to be handled by the caller
  }
}
