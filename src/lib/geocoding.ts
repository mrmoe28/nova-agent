import { z } from "zod";

const GeocodeResultSchema = z.array(z.object({
  lat: z.string(),
  lon: z.string(),
  display_name: z.string(),
})).min(1);

export interface GeocodeCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Geocodes a street address into latitude and longitude using the free Nominatim API.
 * @param address The street address to geocode.
 * @returns A promise that resolves to the coordinates or null if not found.
 */
export async function geocodeAddress(address: string): Promise<GeocodeCoordinates | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.append("q", address);
  url.searchParams.append("format", "json");
  url.searchParams.append("limit", "1");

  console.log(`Geocoding address: ${address}`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        // Per Nominatim's usage policy, a custom User-Agent is required.
        'User-Agent': 'Nova-Agent/1.0 (Solar Analysis Tool)',
      }
    });

    if (!response.ok) {
      console.error("Nominatim API request failed:", response.status, response.statusText);
      throw new Error(`Nominatim API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const validation = GeocodeResultSchema.safeParse(data);

    if (!validation.success) {
      console.error("No valid results found from Nominatim for address:", address);
      return null;
    }

    const firstResult = validation.data[0];
    const coordinates = {
      latitude: parseFloat(firstResult.lat),
      longitude: parseFloat(firstResult.lon),
    };

    console.log(`Geocoded successfully: Lat ${coordinates.latitude}, Lon ${coordinates.longitude}`);
    return coordinates;

  } catch (error) {
    console.error("Error during geocoding:", error);
    // Return null instead of throwing, so the caller can handle the failure gracefully
    return null;
  }
}
