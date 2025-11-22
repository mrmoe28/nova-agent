import { z } from "zod";

// NOTE: This is a speculative schema based on the Rewiring America API's likely output.
// The actual implementation may need adjustments once the API is used in practice.
const IncentiveSchema = z.object({
    item_id: z.string(),
    type: z.string(), // e.g., 'tax_credit', 'rebate'
    program_name: z.string(),
    owner: z.string(), // e.g., 'federal', 'state', 'utility'
    value_type: z.string(), // e.g., 'dollar_amount', 'percent'
    value: z.number(),
    summary: z.string(),
});

const ApiResponseSchema = z.object({
    incentives: z.array(IncentiveSchema),
});

export type Incentive = z.infer<typeof IncentiveSchema>;

interface LocationInfo {
  zip: string;
  // Other location fields like 'state' might be needed depending on API requirements
}

/**
 * Fetches applicable solar incentives from the Rewiring America API.
 * @param location The location information, including at least a ZIP code.
 * @returns A promise that resolves to an array of incentive objects.
 */
export async function getApplicableIncentives(location: LocationInfo): Promise<Incentive[]> {
  const apiKey = process.env.REWIRING_AMERICA_API_KEY;
  if (!apiKey) {
    console.warn("REWIRING_AMERICA_API_KEY is not set. Skipping incentive calculation.");
    return [];
  }

  // The base URL for the Rewiring America API.
  // This is a placeholder and should be verified from their official documentation.
  const baseUrl = "https://api.rewiringamerica.org/v1/incentives";
  const url = new URL(baseUrl);
  
  // Append query parameters as required by the API.
  // This assumes the API can filter by ZIP code.
  url.searchParams.append("zip", location.zip);
  // You might also need to filter by technology, e.g., `tech=solar_pv`
  url.searchParams.append("tech", "solar_pv");

  console.log(`Fetching solar incentives for ZIP code: ${location.zip}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Rewiring America API request failed:", response.status, errorBody);
        // Don't throw an error, just return an empty array to allow analysis to continue
        return [];
    }

    const data = await response.json();
    const validation = ApiResponseSchema.safeParse(data);

    if (!validation.success) {
      console.error("Failed to parse response from Rewiring America API:", validation.error);
      return [];
    }

    console.log(`Found ${validation.data.incentives.length} potentially applicable incentives.`);
    return validation.data.incentives;

  } catch (error) {
    console.error("Error fetching data from Rewiring America API:", error);
    return []; // Return empty array on error to not block the main analysis flow
  }
}
