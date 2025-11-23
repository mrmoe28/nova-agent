## Equipment Categorization Rules

This file documents how scraped products are mapped into `EquipmentCategory`
values for the equipment catalog.

### Core mechanism

- Code location: `src/lib/categorize-product.ts`
- Entry point: `categorizeProduct(name, description?)`
- Scraper hook: `detectCategory(product: ScrapedProduct)` in
  `src/lib/scraper.ts`

`detectCategory` now builds a **combined text context** from:

- `product.name`
- `product.description`
- URL path segments from `product.sourceUrl`
  - e.g. `/collections/batteries/...` → `"collections batteries ..."`
  - e.g. `/collections/rigid-solar-panels/...`
  - e.g. `/collections/hybrid-inverters/...`

That combined string is passed into `categorizeProduct`, which runs a set of
keyword-based regex checks to decide the `EquipmentCategory`.

### Category mappings

The following keywords (in name/description/URL text) drive categorization:

- **SOLAR_PANEL**
  - `"solar panel"`, `"photovoltaic"`, `"pv module"`, `"pv panel"`
  - `"monocrystalline"`, `"polycrystalline"`, `"bifacial panel"`
  - `"rigid solar panel"`, `"flexible solar panel"`
- **BATTERY**
  - `"battery"`, `"batteries"`, `"energy storage"`, `"storage system"`
  - `"lithium"`, `"lifepo4"`, `"lead acid"`, `"agm"`, `"gel battery"`
  - `"powerwall"`, `"battery bank"`
- **INVERTER**
  - `"inverter"`, `"micro-inverter"`, `"microinverter"`, `"string inverter"`
  - `"hybrid inverter"`, `"hybrid-inverters"`, `"all-in-one inverter"`
  - `"grid-tie"`, `"off-grid inverter"`
- **CHARGE_CONTROLLER**
  - `"charge controller"`, `"mppt"`, `"pwm controller"`
  - `"solar controller"`, `"battery controller"`
- **MOUNTING**
  - `"mounting"`, `"mount"`, `"rack"`, `"racking"`, `"rail"`, `"clamp"`
  - `"bracket"`, `"mounting system"`, `"roof mount"`, `"ground mount"`
- **WIRING**
  - `"wire"`, `"wiring"`, `"cable"`, `"conductor"`, `"mc4"`, `"connector"`
  - `"junction box"`, `"combiner box"`, `"conduit"`
- **ELECTRICAL**
  - `"breaker"`, `"disconnect"`, `"fuse"`, `"surge protector"`
  - `"panel board"`, `"electrical panel"`, `"distribution"`, `"switch"`
- **MONITORING**
  - `"monitoring"`, `"meter"`, `"sensor"`, `"gateway"`, `"data logger"`
  - `"monitoring system"`, `"energy monitor"`
- **ACCESSORIES**
  - `"tool"`, `"kit"`, `"adapter"`, `"accessory"`, `"hardware"`
  - `"fastener"`, `"label"`, `"tag"`, `"marker"`
- **OTHER**
  - Fallback if no keywords match

### URL-based behavior

Because `detectCategory` includes URL path segments in the text, any product
under these kinds of URLs will tend to categorize correctly:

- `/collections/batteries/...` → **BATTERY**
- `/collections/rigid-solar-panels/...` → **SOLAR_PANEL**
- `/collections/hybrid-inverters/...` → **INVERTER**

This is in addition to the product name/description keywords.

### How to extend

To support new distributors or product types:

1. Edit `src/lib/categorize-product.ts`.
2. Add new keywords or regex patterns under the appropriate category section.
3. If the category is strongly implied by URL structure, make sure the
   relevant path fragment (e.g. `"charge-controllers"`) is covered by a regex.
4. Optionally add a new sample case to
   `tests/categorize-product.samples.ts` to exercise the new mapping.


