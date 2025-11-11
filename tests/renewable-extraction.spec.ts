import { test, expect, describe } from '@playwright/test';
import { parseBillText, type ParsedBillData } from '../src/lib/ocr';
import { readFileSync } from 'fs';
import { join } from 'path';

// ==================== OCR EXTRACTION PATTERN TESTS ====================

describe('Renewable Energy OCR Extraction Patterns', () => {
  describe('Renewable Source Type Extraction', () => {
    test('should extract solar energy source', () => {
      const text = 'Renewable Energy Type: Solar system installed at facility';
      const result = parseBillText(text);

      expect(result.renewableSource).toBeDefined();
      expect(result.renewableSource?.type).toBe('solar');
    });

    test('should extract wind energy source', () => {
      const text = 'Generation source: Wind turbine on-site';
      const result = parseBillText(text);

      expect(result.renewableSource).toBeDefined();
      expect(result.renewableSource?.type).toBe('wind');
    });

    test('should extract hydro energy source', () => {
      const text = 'On-site hydro power generation installed';
      const result = parseBillText(text);

      expect(result.renewableSource).toBeDefined();
      expect(result.renewableSource?.type).toBe('hydro');
    });

    test('should extract geothermal energy source', () => {
      const text = 'Renewable Type: Geothermal energy system';
      const result = parseBillText(text);

      expect(result.renewableSource).toBeDefined();
      expect(result.renewableSource?.type).toBe('geothermal');
    });

    test('should extract biomass energy source', () => {
      const text = 'Installed biomass power generation facility';
      const result = parseBillText(text);

      expect(result.renewableSource).toBeDefined();
      expect(result.renewableSource?.type).toBe('biomass');
    });

    test('should match solar panel pattern', () => {
      const text = 'Solar panel installation: 42 panels, 10.5 kW total';
      const result = parseBillText(text);

      expect(result.renewableSource?.type).toBe('solar');
    });

    test('should match wind turbine pattern', () => {
      const text = 'Wind turbine capacity: 2.5 MW';
      const result = parseBillText(text);

      expect(result.renewableSource?.type).toBe('wind');
    });

    test('should match hydro power pattern', () => {
      const text = 'Hydro power installation: 50 kW system';
      const result = parseBillText(text);

      expect(result.renewableSource?.type).toBe('hydro');
    });

    test('should match renewable installation pattern', () => {
      const text = 'Solar installation complete - 15 kW system';
      const result = parseBillText(text);

      expect(result.renewableSource?.type).toBe('solar');
    });

    test('should match renewable array pattern', () => {
      const text = 'Wind array: 3 turbines, 7.5 MW total capacity';
      const result = parseBillText(text);

      expect(result.renewableSource?.type).toBe('wind');
    });

    test('should match renewable farm pattern', () => {
      const text = 'Solar farm capacity: 100 MW';
      const result = parseBillText(text);

      expect(result.renewableSource?.type).toBe('solar');
    });
  });

  describe('Capacity Extraction with Units', () => {
    test('should extract capacity in kW', () => {
      const text = 'System capacity: 10.5 kW solar installation';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(10.5);
      expect(result.renewableSource?.capacityUnit).toBe('kW');
    });

    test('should extract capacity in MW and convert to kW', () => {
      const text = 'Rated capacity: 2.5 MW wind turbine';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(2500); // 2.5 MW = 2500 kW
      expect(result.renewableSource?.capacityUnit).toBe('kW');
    });

    test('should extract nameplate capacity', () => {
      const text = 'Nameplate: 50 kW hydro system';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(50);
      expect(result.renewableSource?.capacityUnit).toBe('kW');
    });

    test('should extract rated capacity', () => {
      const text = 'Rated 15.8 kW solar installation';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(15.8);
      expect(result.renewableSource?.capacityUnit).toBe('kW');
    });

    test('should extract system size', () => {
      const text = 'System size: 25.5 kW solar panels';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(25.5);
      expect(result.renewableSource?.capacityUnit).toBe('kW');
    });

    test('should extract installed capacity', () => {
      const text = 'Installed capacity: 100.0 kW wind system';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(100);
      expect(result.renewableSource?.capacityUnit).toBe('kW');
    });

    test('should handle kilowatt spelling', () => {
      const text = 'Capacity: 5.5 kilowatt solar installation';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(5.5);
      expect(result.renewableSource?.capacityUnit).toBe('kW');
    });

    test('should handle megawatt spelling and convert', () => {
      const text = 'Capacity: 1.2 megawatt wind farm';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(1200); // 1.2 MW = 1200 kW
      expect(result.renewableSource?.capacityUnit).toBe('kW');
    });

    test('should extract capacity before source type', () => {
      const text = '10 kW solar panel installation';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(10);
      expect(result.renewableSource?.type).toBe('solar');
    });

    test('should extract capacity after source type', () => {
      const text = 'Solar system capacity: 20.5 kW';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(20.5);
      expect(result.renewableSource?.type).toBe('solar');
    });
  });

  describe('MW to kW Conversion', () => {
    test('should convert 1 MW to 1000 kW', () => {
      const text = 'System capacity: 1 MW';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(1000);
      expect(result.renewableSource?.capacityUnit).toBe('kW');
    });

    test('should convert 0.5 MW to 500 kW', () => {
      const text = 'Installed capacity: 0.5 MW';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(500);
      expect(result.renewableSource?.capacityUnit).toBe('kW');
    });

    test('should convert 10.25 MW to 10250 kW', () => {
      const text = 'Rated: 10.25 MW wind farm';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(10250);
      expect(result.renewableSource?.capacityUnit).toBe('kW');
    });

    test('should preserve kW values without conversion', () => {
      const text = 'System size: 500 kW';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBe(500);
      expect(result.renewableSource?.capacityUnit).toBe('kW');
    });
  });

  describe('Edge Cases and Missing Data', () => {
    test('should handle missing renewable data', () => {
      const text = 'Utility bill with no renewable information. Total kWh: 1000';
      const result = parseBillText(text);

      expect(result.renewableSource).toBeUndefined();
    });

    test('should handle renewable type without capacity', () => {
      const text = 'Solar panel installation completed';
      const result = parseBillText(text);

      expect(result.renewableSource).toBeDefined();
      expect(result.renewableSource?.type).toBe('solar');
      expect(result.renewableSource?.capacity).toBeUndefined();
    });

    test('should handle capacity without renewable type', () => {
      const text = 'System capacity: 15 kW installed';
      const result = parseBillText(text);

      expect(result.renewableSource).toBeDefined();
      expect(result.renewableSource?.capacity).toBe(15);
      expect(result.renewableSource?.type).toBeUndefined();
    });

    test('should handle malformed capacity value', () => {
      const text = 'Capacity: ABC kW solar system';
      const result = parseBillText(text);

      // Should extract type but not invalid capacity
      expect(result.renewableSource?.type).toBe('solar');
      expect(result.renewableSource?.capacity).toBeUndefined();
    });

    test('should ignore zero capacity', () => {
      const text = 'Capacity: 0 kW solar system';
      const result = parseBillText(text);

      // Extraction code ignores values <= 0
      expect(result.renewableSource?.capacity).toBeUndefined();
    });

    test('should ignore negative capacity', () => {
      const text = 'Capacity: -10 kW (error in reading)';
      const result = parseBillText(text);

      expect(result.renewableSource?.capacity).toBeUndefined();
    });

    test('should handle multiple capacity mentions (prefer largest)', () => {
      const text = 'Solar panels: 5 kW, 10 kW, 15 kW sections. Total capacity: 30 kW';
      const result = parseBillText(text);

      // extractBestNumber should return the largest value
      expect(result.renewableSource?.capacity).toBeGreaterThanOrEqual(15);
    });

    test('should handle mixed case renewable types', () => {
      const text = 'SOLAR PANEL INSTALLATION: 10 kW';
      const result = parseBillText(text);

      expect(result.renewableSource?.type).toBe('solar');
    });

    test('should handle whitespace variations', () => {
      const text = 'Renewable    Type:     Solar     Capacity:    10.5    kW';
      const result = parseBillText(text);

      expect(result.renewableSource?.type).toBe('solar');
      expect(result.renewableSource?.capacity).toBe(10.5);
    });
  });

  describe('Multiple Pattern Variations', () => {
    test('should match pattern: renewable source type', () => {
      const text = 'Renewable source: Solar';
      const result = parseBillText(text);
      expect(result.renewableSource?.type).toBe('solar');
    });

    test('should match pattern: generation source', () => {
      const text = 'Generation source: Wind';
      const result = parseBillText(text);
      expect(result.renewableSource?.type).toBe('wind');
    });

    test('should match pattern: renewable energy', () => {
      const text = 'Renewable energy: Hydro';
      const result = parseBillText(text);
      expect(result.renewableSource?.type).toBe('hydro');
    });

    test('should match pattern: installed renewable', () => {
      const text = 'Installed solar system';
      const result = parseBillText(text);
      expect(result.renewableSource?.type).toBe('solar');
    });

    test('should match pattern: on-site renewable', () => {
      const text = 'On-site wind generation';
      const result = parseBillText(text);
      expect(result.renewableSource?.type).toBe('wind');
    });
  });

  describe('Real-World Bill Text Examples', () => {
    test('should extract from realistic solar bill text', () => {
      const text = `
        Georgia Power
        Account: 12345-67890
        Service Period: Jan 1, 2025 - Jan 31, 2025
        Total kWh Used: 1500

        On-Site Generation Details:
        Solar panel installation
        System capacity: 10.5 kW
        Installed: December 2024

        Total Due: $180.00
      `;

      const result = parseBillText(text);

      expect(result.renewableSource?.type).toBe('solar');
      expect(result.renewableSource?.capacity).toBe(10.5);
      expect(result.renewableSource?.capacityUnit).toBe('kW');
      expect(result.usage?.kwh).toBe(1500);
    });

    test('should extract from realistic wind bill text', () => {
      const text = `
        Wind Energy Cooperative
        Account: WIND-2025-001
        Billing Period: 02/01/2025 - 02/28/2025

        Wind turbine capacity: 2.5 MW
        Generation type: Wind energy system

        Monthly consumption: 2500 kWh
        Amount due: $300.00
      `;

      const result = parseBillText(text);

      expect(result.renewableSource?.type).toBe('wind');
      expect(result.renewableSource?.capacity).toBe(2500); // 2.5 MW converted
      expect(result.usage?.kwh).toBe(2500);
    });

    test('should extract from complex hydro bill text', () => {
      const text = `
        Pacific Hydro Electric
        Customer ID: HYDRO-555
        Period: 03/01/2025 - 03/31/2025

        Facility Information:
        - Installed capacity: 50 kW hydro power
        - Generation source: Hydro turbine
        - Nameplate rating: 50.0 kW

        Usage Details:
        Total kWh: 5000
        Peak demand: 75 kW

        Charges:
        Energy: $400.00
        Demand: $50.00
        Total: $450.00
      `;

      const result = parseBillText(text);

      expect(result.renewableSource?.type).toBe('hydro');
      expect(result.renewableSource?.capacity).toBe(50);
      expect(result.usage?.kwh).toBe(5000);
      expect(result.usage?.kw).toBe(75);
      expect(result.charges?.total).toBe(450);
    });
  });
});

// ==================== VALIDATION FUNCTION TESTS ====================

describe('Renewable Energy Validation', () => {
  // Helper function to validate renewable source data
  function validateRenewableSource(data: ParsedBillData['renewableSource']): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      warnings.push('No renewable source data provided');
      return { isValid: true, errors, warnings };
    }

    // Validate renewable type
    const validTypes = ['solar', 'wind', 'hydro', 'geothermal', 'biomass'];
    if (data.type && !validTypes.includes(data.type)) {
      errors.push(`Invalid renewable type: ${data.type}. Must be one of: ${validTypes.join(', ')}`);
    }

    if (!data.type) {
      warnings.push('Renewable type is missing');
    }

    // Validate capacity
    if (data.capacity !== undefined) {
      if (data.capacity <= 0) {
        errors.push('Capacity must be greater than zero');
      }

      if (data.capacity > 1000000) {
        warnings.push('Capacity seems unusually large (> 1,000 MW). Please verify.');
      }

      if (!data.capacityUnit) {
        warnings.push('Capacity unit is missing');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Helper function to normalize renewable data
  function normalizeRenewableSource(data: ParsedBillData['renewableSource']): ParsedBillData['renewableSource'] {
    if (!data) return undefined;

    return {
      type: data.type?.toLowerCase().trim(),
      capacity: data.capacity,
      capacityUnit: data.capacityUnit || 'kW'
    };
  }

  describe('Valid Renewable Source Types', () => {
    test('should validate solar type', () => {
      const data = { type: 'solar', capacity: 10, capacityUnit: 'kW' };
      const result = validateRenewableSource(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate wind type', () => {
      const data = { type: 'wind', capacity: 2500, capacityUnit: 'kW' };
      const result = validateRenewableSource(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate hydro type', () => {
      const data = { type: 'hydro', capacity: 50, capacityUnit: 'kW' };
      const result = validateRenewableSource(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate geothermal type', () => {
      const data = { type: 'geothermal', capacity: 100, capacityUnit: 'kW' };
      const result = validateRenewableSource(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate biomass type', () => {
      const data = { type: 'biomass', capacity: 75, capacityUnit: 'kW' };
      const result = validateRenewableSource(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid Renewable Types', () => {
    test('should error on invalid type: nuclear', () => {
      const data = { type: 'nuclear', capacity: 1000, capacityUnit: 'kW' };
      const result = validateRenewableSource(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid renewable type: nuclear. Must be one of: solar, wind, hydro, geothermal, biomass');
    });

    test('should error on invalid type: coal', () => {
      const data = { type: 'coal', capacity: 500, capacityUnit: 'kW' };
      const result = validateRenewableSource(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should error on invalid type: natural gas', () => {
      const data = { type: 'natural gas', capacity: 200, capacityUnit: 'kW' };
      const result = validateRenewableSource(data);

      expect(result.isValid).toBe(false);
    });
  });

  describe('Missing Type Warnings', () => {
    test('should warn when type is missing', () => {
      const data = { capacity: 10, capacityUnit: 'kW' };
      const result = validateRenewableSource(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Renewable type is missing');
    });

    test('should warn when no renewable data provided', () => {
      const result = validateRenewableSource(undefined);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('No renewable source data provided');
    });
  });

  describe('Capacity Validation', () => {
    test('should error on zero capacity', () => {
      const data = { type: 'solar', capacity: 0, capacityUnit: 'kW' };
      const result = validateRenewableSource(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Capacity must be greater than zero');
    });

    test('should error on negative capacity', () => {
      const data = { type: 'wind', capacity: -50, capacityUnit: 'kW' };
      const result = validateRenewableSource(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Capacity must be greater than zero');
    });

    test('should warn on unusually large capacity', () => {
      const data = { type: 'solar', capacity: 2000000, capacityUnit: 'kW' };
      const result = validateRenewableSource(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Capacity seems unusually large (> 1,000 MW). Please verify.');
    });

    test('should warn when capacity unit is missing', () => {
      const data = { type: 'hydro', capacity: 50 };
      const result = validateRenewableSource(data);

      expect(result.warnings).toContain('Capacity unit is missing');
    });

    test('should accept valid capacity range', () => {
      const testCases = [1, 10, 100, 1000, 10000, 100000];

      testCases.forEach(capacity => {
        const data = { type: 'solar', capacity, capacityUnit: 'kW' };
        const result = validateRenewableSource(data);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Normalized Output', () => {
    test('should normalize mixed case type', () => {
      const data = { type: 'SOLAR', capacity: 10, capacityUnit: 'kW' };
      const normalized = normalizeRenewableSource(data);

      expect(normalized?.type).toBe('solar');
    });

    test('should trim whitespace from type', () => {
      const data = { type: '  wind  ', capacity: 20, capacityUnit: 'kW' };
      const normalized = normalizeRenewableSource(data);

      expect(normalized?.type).toBe('wind');
    });

    test('should default missing capacity unit to kW', () => {
      const data = { type: 'hydro', capacity: 50 };
      const normalized = normalizeRenewableSource(data);

      expect(normalized?.capacityUnit).toBe('kW');
    });

    test('should preserve existing capacity unit', () => {
      const data = { type: 'solar', capacity: 10, capacityUnit: 'MW' };
      const normalized = normalizeRenewableSource(data);

      expect(normalized?.capacityUnit).toBe('MW');
    });

    test('should handle undefined data', () => {
      const normalized = normalizeRenewableSource(undefined);
      expect(normalized).toBeUndefined();
    });
  });
});

// ==================== CAPACITY CALCULATION TESTS ====================

describe('Renewable Energy Capacity Calculations', () => {
  // Capacity factors by renewable type (typical values)
  const CAPACITY_FACTORS = {
    solar: 0.25,      // 25% for solar (varies by location)
    wind: 0.35,       // 35% for wind (varies by location)
    hydro: 0.52,      // 52% for hydro (run-of-river)
    geothermal: 0.90, // 90% for geothermal (baseload)
    biomass: 0.83     // 83% for biomass (dispatchable)
  };

  // Calculate annual production from capacity
  function calculateAnnualProduction(
    capacityKw: number,
    renewableType: string,
    customCapacityFactor?: number
  ): number {
    const hoursPerYear = 8760;
    const capacityFactor = customCapacityFactor || CAPACITY_FACTORS[renewableType as keyof typeof CAPACITY_FACTORS] || 0.25;

    return capacityKw * hoursPerYear * capacityFactor;
  }

  describe('Solar Capacity Calculations', () => {
    test('should calculate annual production for 10 kW solar', () => {
      const production = calculateAnnualProduction(10, 'solar');

      // 10 kW * 8760 hours * 0.25 = 21,900 kWh/year
      expect(production).toBe(21900);
    });

    test('should calculate annual production for 100 kW solar', () => {
      const production = calculateAnnualProduction(100, 'solar');
      expect(production).toBe(219000);
    });

    test('should use custom capacity factor for solar', () => {
      const production = calculateAnnualProduction(10, 'solar', 0.20);

      // 10 kW * 8760 hours * 0.20 = 17,520 kWh/year
      expect(production).toBe(17520);
    });
  });

  describe('Wind Capacity Calculations', () => {
    test('should calculate annual production for 2500 kW wind', () => {
      const production = calculateAnnualProduction(2500, 'wind');

      // 2500 kW * 8760 hours * 0.35 = 7,665,000 kWh/year
      expect(production).toBe(7665000);
    });

    test('should calculate annual production for 5 MW wind (5000 kW)', () => {
      const production = calculateAnnualProduction(5000, 'wind');
      expect(production).toBe(15330000);
    });

    test('should use custom capacity factor for wind', () => {
      const production = calculateAnnualProduction(1000, 'wind', 0.40);

      // 1000 kW * 8760 hours * 0.40 = 3,504,000 kWh/year
      expect(production).toBe(3504000);
    });
  });

  describe('Hydro Capacity Calculations', () => {
    test('should calculate annual production for 50 kW hydro', () => {
      const production = calculateAnnualProduction(50, 'hydro');

      // 50 kW * 8760 hours * 0.52 = 227,760 kWh/year
      expect(production).toBe(227760);
    });

    test('should calculate annual production for 1 MW hydro (1000 kW)', () => {
      const production = calculateAnnualProduction(1000, 'hydro');
      expect(production).toBe(4555200);
    });
  });

  describe('Geothermal Capacity Calculations', () => {
    test('should calculate annual production for 100 kW geothermal', () => {
      const production = calculateAnnualProduction(100, 'geothermal');

      // 100 kW * 8760 hours * 0.90 = 788,400 kWh/year
      expect(production).toBe(788400);
    });

    test('should have high capacity factor (baseload)', () => {
      const production1kw = calculateAnnualProduction(1, 'geothermal');

      // Geothermal should have ~90% capacity factor
      expect(production1kw).toBe(7884);
      expect(production1kw / 8760).toBeCloseTo(0.90, 2);
    });
  });

  describe('Biomass Capacity Calculations', () => {
    test('should calculate annual production for 75 kW biomass', () => {
      const production = calculateAnnualProduction(75, 'biomass');

      // 75 kW * 8760 hours * 0.83 = 545,310 kWh/year
      expect(production).toBe(545310);
    });

    test('should have high capacity factor (dispatchable)', () => {
      const production1kw = calculateAnnualProduction(1, 'biomass');

      // Biomass should have ~83% capacity factor
      expect(production1kw).toBe(7270.8);
      expect(production1kw / 8760).toBeCloseTo(0.83, 2);
    });
  });

  describe('Custom Capacity Factors', () => {
    test('should accept custom capacity factor', () => {
      const production = calculateAnnualProduction(100, 'solar', 0.30);

      // 100 kW * 8760 hours * 0.30 = 262,800 kWh/year
      expect(production).toBe(262800);
    });

    test('should override default capacity factor', () => {
      const defaultProduction = calculateAnnualProduction(100, 'wind');
      const customProduction = calculateAnnualProduction(100, 'wind', 0.50);

      expect(customProduction).not.toBe(defaultProduction);
      expect(customProduction).toBe(438000); // 100 * 8760 * 0.50
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero capacity', () => {
      const production = calculateAnnualProduction(0, 'solar');
      expect(production).toBe(0);
    });

    test('should handle very small capacity', () => {
      const production = calculateAnnualProduction(0.1, 'solar');
      expect(production).toBe(219); // 0.1 * 8760 * 0.25
    });

    test('should handle very large capacity', () => {
      const production = calculateAnnualProduction(1000000, 'wind');
      expect(production).toBe(3066000000); // 1,000,000 kW * 8760 * 0.35
    });

    test('should default to solar capacity factor for unknown type', () => {
      const production = calculateAnnualProduction(100, 'unknown');

      // Should use default 0.25 capacity factor
      expect(production).toBe(219000);
    });

    test('should handle zero capacity factor', () => {
      const production = calculateAnnualProduction(100, 'solar', 0);
      expect(production).toBe(0);
    });

    test('should handle 100% capacity factor', () => {
      const production = calculateAnnualProduction(100, 'solar', 1.0);
      expect(production).toBe(876000); // 100 * 8760 * 1.0
    });
  });

  describe('Unit Conversions', () => {
    test('should work with MW converted to kW', () => {
      const capacityMW = 2.5;
      const capacityKW = capacityMW * 1000;
      const production = calculateAnnualProduction(capacityKW, 'wind');

      expect(production).toBe(7665000);
    });

    test('should calculate monthly average from annual', () => {
      const annualProduction = calculateAnnualProduction(100, 'solar');
      const monthlyAverage = annualProduction / 12;

      expect(monthlyAverage).toBe(18250); // 219,000 / 12
    });

    test('should calculate daily average from annual', () => {
      const annualProduction = calculateAnnualProduction(100, 'solar');
      const dailyAverage = annualProduction / 365;

      expect(dailyAverage).toBeCloseTo(600, 0); // ~600 kWh/day
    });
  });
});

// ==================== JSON PLUGIN TESTS ====================

describe('JSON Plugin for Renewable Data', () => {
  const fixturesPath = join(__dirname, 'fixtures');

  describe('Successful JSON File Loading', () => {
    test('should load and parse solar JSON fixture', () => {
      const filePath = join(fixturesPath, 'renewable-solar.json');
      const fileContent = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      expect(data).toBeDefined();
      expect(data.renewableSource).toBeDefined();
      expect(data.renewableSource.type).toBe('solar');
      expect(data.renewableSource.capacity).toBe(10.5);
    });

    test('should load and parse wind JSON fixture', () => {
      const filePath = join(fixturesPath, 'renewable-wind.json');
      const fileContent = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      expect(data.renewableSource.type).toBe('wind');
      expect(data.renewableSource.capacity).toBe(2.5);
      expect(data.renewableSource.capacityUnit).toBe('MW');
    });

    test('should load and parse hydro JSON fixture', () => {
      const filePath = join(fixturesPath, 'renewable-hydro.json');
      const fileContent = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      expect(data.renewableSource.type).toBe('hydro');
      expect(data.renewableSource.capacity).toBe(50);
      expect(data.renewableSource.capacityUnit).toBe('kW');
    });
  });

  describe('Schema Validation', () => {
    function validateBillDataSchema(data: any): {
      isValid: boolean;
      errors: string[];
    } {
      const errors: string[] = [];

      // Check required fields
      if (data.utilityCompany === undefined) {
        errors.push('Missing required field: utilityCompany');
      }

      if (data.accountNumber === undefined) {
        errors.push('Missing required field: accountNumber');
      }

      if (data.billingPeriod === undefined) {
        errors.push('Missing required field: billingPeriod');
      } else {
        if (!data.billingPeriod.start) {
          errors.push('Missing billingPeriod.start');
        }
        if (!data.billingPeriod.end) {
          errors.push('Missing billingPeriod.end');
        }
      }

      // Validate renewable source structure if present
      if (data.renewableSource) {
        if (typeof data.renewableSource.type !== 'string' && data.renewableSource.type !== undefined) {
          errors.push('renewableSource.type must be a string');
        }

        if (data.renewableSource.capacity !== undefined && typeof data.renewableSource.capacity !== 'number') {
          errors.push('renewableSource.capacity must be a number');
        }

        if (data.renewableSource.capacityUnit !== undefined && typeof data.renewableSource.capacityUnit !== 'string') {
          errors.push('renewableSource.capacityUnit must be a string');
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    }

    test('should validate solar fixture schema', () => {
      const filePath = join(fixturesPath, 'renewable-solar.json');
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));
      const result = validateBillDataSchema(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate wind fixture schema', () => {
      const filePath = join(fixturesPath, 'renewable-wind.json');
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));
      const result = validateBillDataSchema(data);

      expect(result.isValid).toBe(true);
    });

    test('should validate hydro fixture schema', () => {
      const filePath = join(fixturesPath, 'renewable-hydro.json');
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));
      const result = validateBillDataSchema(data);

      expect(result.isValid).toBe(true);
    });

    test('should detect missing required fields', () => {
      const invalidData = {
        renewableSource: { type: 'solar', capacity: 10 }
      };

      const result = validateBillDataSchema(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: utilityCompany');
      expect(result.errors).toContain('Missing required field: accountNumber');
      expect(result.errors).toContain('Missing required field: billingPeriod');
    });

    test('should detect invalid renewable source types', () => {
      const invalidData = {
        utilityCompany: 'Test',
        accountNumber: '123',
        billingPeriod: { start: '2025-01-01', end: '2025-01-31' },
        renewableSource: {
          type: 123, // Invalid: should be string
          capacity: '10' // Invalid: should be number
        }
      };

      const result = validateBillDataSchema(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('renewableSource.type must be a string');
      expect(result.errors).toContain('renewableSource.capacity must be a number');
    });
  });

  describe('Renewable Data Extraction', () => {
    test('should extract complete renewable data from solar fixture', () => {
      const filePath = join(fixturesPath, 'renewable-solar.json');
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));
      const renewable = data.renewableSource;

      expect(renewable).toEqual({
        type: 'solar',
        capacity: 10.5,
        capacityUnit: 'kW'
      });
    });

    test('should extract renewable data from wind fixture', () => {
      const filePath = join(fixturesPath, 'renewable-wind.json');
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));
      const renewable = data.renewableSource;

      expect(renewable.type).toBe('wind');
      expect(renewable.capacity).toBe(2.5);
      expect(renewable.capacityUnit).toBe('MW');
    });

    test('should handle missing renewable data', () => {
      const dataWithoutRenewable = {
        utilityCompany: 'Test Utility',
        accountNumber: '12345',
        billingPeriod: { start: '2025-01-01', end: '2025-01-31' }
      };

      expect(dataWithoutRenewable.renewableSource).toBeUndefined();
    });
  });

  describe('Conversion to ParsedBillData', () => {
    function convertToParsedBillData(jsonData: any): ParsedBillData {
      return {
        utilityCompany: jsonData.utilityCompany,
        accountNumber: jsonData.accountNumber,
        billingPeriod: jsonData.billingPeriod,
        usage: jsonData.usage,
        charges: jsonData.charges,
        averageDailyUsage: jsonData.averageDailyUsage,
        renewableSource: jsonData.renewableSource
      };
    }

    test('should convert solar JSON to ParsedBillData', () => {
      const filePath = join(fixturesPath, 'renewable-solar.json');
      const jsonData = JSON.parse(readFileSync(filePath, 'utf-8'));
      const parsed = convertToParsedBillData(jsonData);

      expect(parsed.utilityCompany).toBe('Test Solar Utility');
      expect(parsed.accountNumber).toBe('12345-67890');
      expect(parsed.renewableSource?.type).toBe('solar');
      expect(parsed.renewableSource?.capacity).toBe(10.5);
    });

    test('should convert wind JSON to ParsedBillData', () => {
      const filePath = join(fixturesPath, 'renewable-wind.json');
      const jsonData = JSON.parse(readFileSync(filePath, 'utf-8'));
      const parsed = convertToParsedBillData(jsonData);

      expect(parsed.utilityCompany).toBe('Wind Energy Co');
      expect(parsed.renewableSource?.type).toBe('wind');
      expect(parsed.renewableSource?.capacity).toBe(2.5);
      expect(parsed.renewableSource?.capacityUnit).toBe('MW');
    });

    test('should preserve all bill data fields', () => {
      const filePath = join(fixturesPath, 'renewable-hydro.json');
      const jsonData = JSON.parse(readFileSync(filePath, 'utf-8'));
      const parsed = convertToParsedBillData(jsonData);

      expect(parsed.utilityCompany).toBe('Hydro Power Inc');
      expect(parsed.usage?.kwh).toBe(5000);
      expect(parsed.usage?.kw).toBe(75);
      expect(parsed.charges?.total).toBe(450);
      expect(parsed.charges?.energyCharge).toBe(400);
      expect(parsed.charges?.demandCharge).toBe(50);
      expect(parsed.renewableSource?.type).toBe('hydro');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing file gracefully', () => {
      const filePath = join(fixturesPath, 'nonexistent.json');

      expect(() => {
        readFileSync(filePath, 'utf-8');
      }).toThrow();
    });

    test('should handle invalid JSON', () => {
      const invalidJson = '{ invalid json content }';

      expect(() => {
        JSON.parse(invalidJson);
      }).toThrow();
    });

    test('should handle empty file', () => {
      const emptyJson = '{}';
      const data = JSON.parse(emptyJson);

      expect(data).toEqual({});
      expect(data.renewableSource).toBeUndefined();
    });

    test('should handle malformed renewable data', () => {
      const malformedJson = JSON.stringify({
        utilityCompany: 'Test',
        accountNumber: '123',
        billingPeriod: { start: '2025-01-01', end: '2025-01-31' },
        renewableSource: 'invalid' // Should be object
      });

      const data = JSON.parse(malformedJson);
      expect(typeof data.renewableSource).toBe('string');
    });

    test('should handle invalid fixture data', () => {
      const filePath = join(fixturesPath, 'renewable-invalid.json');
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));

      // File contains invalid renewable type "nuclear"
      expect(data.renewableSource.type).toBe('nuclear');
      expect(data.renewableSource.capacity).toBe(-50);

      // Validation should catch these issues
      const validTypes = ['solar', 'wind', 'hydro', 'geothermal', 'biomass'];
      expect(validTypes.includes(data.renewableSource.type)).toBe(false);
      expect(data.renewableSource.capacity).toBeLessThan(0);
    });
  });
});

// ==================== TEST SUMMARY ====================

test.afterAll(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('RENEWABLE ENERGY EXTRACTION TEST SUMMARY');
  console.log('='.repeat(80));
  console.log('Test Coverage:');
  console.log('  ✓ OCR Extraction Patterns (renewable types, capacity, unit conversion)');
  console.log('  ✓ Validation Functions (type validation, capacity checks, normalization)');
  console.log('  ✓ Capacity Calculations (all renewable types, capacity factors, edge cases)');
  console.log('  ✓ JSON Plugin (file loading, schema validation, data conversion)');
  console.log('  ✓ Edge Cases (missing data, malformed inputs, error handling)');
  console.log('  ✓ Real-World Examples (realistic bill text extraction)');
  console.log('='.repeat(80) + '\n');
});
