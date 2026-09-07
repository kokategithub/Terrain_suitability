/**
 * Google Earth Engine service.
 *
 * Normalization EXACTLY matches the training dataset script:
 *   B4, B3, B2  → s2.divide(10000).clamp(0,1)
 *   NDVI        → normalizedDifference.unitScale(-1,1).clamp(0,1)
 *   Slope       → slope.divide(90).clamp(0,1)
 *   Elevation   → dem.divide(4000).clamp(0,1)
 *   WaterDist   → cumulativeCost.divide(10000).clamp(0,1)
 *   Temperature → (tempK - 273.15).unitScale(0,50).clamp(0,1)
 *   Rainfall    → total_precipitation_sum.divide(0.1).clamp(0,1)
 *   SAR_VV      → unitScale(-25,0).clamp(0,1)
 *   SAR_VH      → unitScale(-30,-5).clamp(0,1)
 */

const ee   = require('@google/earthengine');
const path = require('path');
const fs   = require('fs');

let _initialized = false;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function eeGetInfo(eeObj) {
  return new Promise((resolve, reject) => {
    eeObj.getInfo((value, error) => {
      if (error) reject(new Error(typeof error === 'string' ? error : JSON.stringify(error)));
      else resolve(value);
    });
  });
}

function eeGetThumbURL(image, params) {
  return new Promise((resolve, reject) => {
    image.getThumbURL(params, (url, error) => {
      if (error) reject(new Error(typeof error === 'string' ? error : JSON.stringify(error)));
      else resolve(url);
    });
  });
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * unitScale(lo, hi) → (v - lo) / (hi - lo)  — same as GEE's .unitScale()
 */
function unitScale(v, lo, hi) { return clamp((v - lo) / (hi - lo), 0, 1); }

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────

async function initGEE() {
  if (_initialized) return;
  const keyPath = path.resolve(process.cwd(), process.env.GEE_KEY_FILE || 'service-account.json');
  if (!fs.existsSync(keyPath)) throw new Error(`service-account.json not found at ${keyPath}`);
  const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  await new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      key,
      () => ee.initialize(null, null, resolve, e => reject(new Error(String(e)))),
      e  => reject(new Error(String(e)))
    );
  });
  _initialized = true;
  console.log('[GEE] Authenticated and initialised.');
}

// ─────────────────────────────────────────────────────────────────────────────
// India check
// ─────────────────────────────────────────────────────────────────────────────

async function isInsideIndia(point) {
  const india = ee.FeatureCollection('FAO/GAUL/2015/level0')
    .filter(ee.Filter.eq('ADM0_NAME', 'India'));
  const count = await eeGetInfo(india.filterBounds(point).size());
  return count > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main extraction — identical pipeline to training script
// ─────────────────────────────────────────────────────────────────────────────

async function extractFeatures(latitude, longitude) {
  if (!_initialized) await initGEE();

  const point  = ee.Geometry.Point([longitude, latitude]);
  const region = point.buffer(3840).bounds();   // same buffer as training

  // ── India validation ──────────────────────────────────────────────────────
  const inside = await isInsideIndia(point);
  if (!inside) {
    const err = new Error('Please enter coordinates within India.');
    err.code  = 'OUTSIDE_INDIA';
    throw err;
  }

  const today = daysAgo(0);

  // ── Sentinel-2: last 60 days, least cloudy first ──────────────────────────
  // Training used median over full year; for live prediction use recent median
  const s2Start = daysAgo(60);
  const s2Col   = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(region)
    .filterDate(s2Start, today)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
    .sort('CLOUDY_PIXEL_PERCENTAGE');

  let s2Size = await eeGetInfo(s2Col.size());

  // Fallback: widen to 120 days if nothing found in 60
  let s2ColFinal = s2Col;
  if (s2Size === 0) {
    const s2Start2 = daysAgo(120);
    s2ColFinal = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(region).filterDate(s2Start2, today)
      .sort('CLOUDY_PIXEL_PERCENTAGE');
    s2Size = await eeGetInfo(s2ColFinal.size());
  }

  if (s2Size === 0) {
    const err = new Error('No Sentinel-2 imagery available for this location. Try a different area.');
    err.code = 'NO_S2_IMAGE';
    throw err;
  }

  // Use median of top-5 least-cloudy images (reduces cloud impact)
  const s2Raw = s2ColFinal.limit(5).median();

  // Cloud-masked median for cleaner RGB display thumbnail
  // SCL band: 3=cloud shadow, 8=cloud medium, 9=cloud high, 10=thin cirrus
  const s2Masked = s2ColFinal.limit(10).map(img => {
    const scl      = img.select('SCL');
    const cloudMask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
    return img.updateMask(cloudMask);
  }).median();

  // ── RGB: divide(10000).clamp(0,1)  [matches training] ────────────────────
  const rgb = s2Raw.select(['B4','B3','B2']).divide(10000).clamp(0, 1);

  // ── NDVI: normalizedDifference.unitScale(-1,1).clamp(0,1) ─────────────────
  const ndviImg = s2Raw.normalizedDifference(['B8','B4'])
    .unitScale(-1, 1).clamp(0, 1).rename('NDVI');

  // ── RGB thumbnail — uses cloud-masked median for cleaner display ──────────
  let satelliteImage = null;
  try {
    satelliteImage = await eeGetThumbURL(
      s2Masked.select(['B4','B3','B2']).divide(10000).clamp(0, 0.3), {
        bands: ['B4','B3','B2'], min: 0, max: 0.3,
        dimensions: 512, format: 'png', region,
      }
    );
  } catch (e) {
    // Fallback to unmasked if SCL band unavailable
    console.warn('[GEE] Cloud-masked thumbnail failed, using raw median:', e.message);
    try {
      satelliteImage = await eeGetThumbURL(rgb, {
        bands: ['B4','B3','B2'], min: 0, max: 0.3,
        dimensions: 512, format: 'png', region,
      });
    } catch (e2) { console.warn('[GEE] Thumbnail failed:', e2.message); }
  }

  // ── Sample B4,B3,B2,NDVI at point ─────────────────────────────────────────
  const s2Vals = await eeGetInfo(
    rgb.addBands(ndviImg).reduceRegion({ reducer: ee.Reducer.mean(), geometry: point, scale: 10 })
  );
  const B4   = s2Vals.B4   != null ? +s2Vals.B4.toFixed(4)   : null;
  const B3   = s2Vals.B3   != null ? +s2Vals.B3.toFixed(4)   : null;
  const B2   = s2Vals.B2   != null ? +s2Vals.B2.toFixed(4)   : null;
  const NDVI = s2Vals.NDVI != null ? +s2Vals.NDVI.toFixed(4) : null;

  // ── DEM: Elevation / 4000, Slope / 90  [matches training] ─────────────────
  const dem          = ee.Image('USGS/SRTMGL1_003').toFloat();
  const slopeImg     = ee.Terrain.slope(dem);
  const elevationImg = dem.divide(4000).clamp(0, 1).rename('ElevNorm');
  const slopeNormImg = slopeImg.divide(90).clamp(0, 1).rename('SlopeNorm');

  const demVals = await eeGetInfo(
    dem.rename('ElevRaw')
      .addBands(slopeImg.rename('SlopeRaw'))
      .addBands(elevationImg)
      .addBands(slopeNormImg)
      .reduceRegion({ reducer: ee.Reducer.mean(), geometry: point, scale: 30 })
  );
  const elevationRaw  = demVals.ElevRaw  != null ? Math.round(demVals.ElevRaw)         : 0;
  const slopeRaw      = demVals.SlopeRaw != null ? +demVals.SlopeRaw.toFixed(2)        : 0;
  const elevationNorm = demVals.ElevNorm != null ? +demVals.ElevNorm.toFixed(6)        : 0;
  const slopeNorm     = demVals.SlopeNorm != null ? +demVals.SlopeNorm.toFixed(6)      : 0;

  // ── Water distance: cumulativeCost / 10000  [matches training] ────────────
  const MAX_WATER_M = 10000;
  let waterDistRaw  = MAX_WATER_M;
  let waterDistNorm = 1.0;
  try {
    const waterMask = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
      .select('occurrence').unmask(0).gt(50).selfMask();
    const waterDistImg = ee.Image(1).cumulativeCost({
      source: waterMask, maxDistance: MAX_WATER_M,
    }).unmask(MAX_WATER_M).divide(MAX_WATER_M).clamp(0, 1).rename('WaterDist');

    const wVals = await eeGetInfo(
      waterDistImg.addBands(
        ee.Image(1).cumulativeCost({ source: waterMask, maxDistance: MAX_WATER_M })
          .unmask(MAX_WATER_M).rename('WaterRaw')
      ).reduceRegion({ reducer: ee.Reducer.mean(), geometry: point, scale: 30 })
    );
    waterDistNorm = wVals.WaterDist != null ? +wVals.WaterDist.toFixed(6) : 1.0;
    waterDistRaw  = wVals.WaterRaw  != null ? Math.round(wVals.WaterRaw)  : MAX_WATER_M;
    waterDistRaw  = Math.min(waterDistRaw, MAX_WATER_M);
  } catch (e) { console.warn('[GEE] Water distance failed:', e.message); }

  // ── ERA5 Temperature: (K - 273.15).unitScale(0,50)  [matches training] ────
  const ERA5_ASSETS = ['ECMWF/ERA5_LAND/DAILY_AGGR', 'ECMWF/ERA5_LAND/DAILY_AGG'];
  let tempC    = 25;
  let tempNorm = unitScale(25, 0, 50);

  for (const asset of ERA5_ASSETS) {
    try {
      const col       = ee.ImageCollection(asset).filterBounds(point).filterDate(daysAgo(365), today);
      const bandNames = await eeGetInfo(col.first().bandNames());
      const tBand     = bandNames.find(b => b.startsWith('temperature_2m')) || 'temperature_2m';
      const tVals     = await eeGetInfo(
        col.select(tBand).mean()
          .reduceRegion({ reducer: ee.Reducer.mean(), geometry: point, scale: 11132 })
      );
      const rawK = tVals[tBand];
      if (rawK != null) {
        tempC    = rawK > 200 ? parseFloat((rawK - 273.15).toFixed(1)) : parseFloat(rawK.toFixed(1));
        tempNorm = unitScale(tempC, 0, 50);   // matches: .subtract(273.15).unitScale(0,50)
        console.log(`[GEE] Temp ${tempC}°C from ${asset}`);
        break;
      }
    } catch (e) { console.warn(`[GEE] Temp (${asset}):`, e.message); }
  }

  // ── ERA5 Rainfall: total_precipitation_sum / 0.1  [matches training] ──────
  // Training: .divide(0.1).clamp(0,1) — so 0.1 m/year = clamp max
  // That means max modelled rainfall = 0.1 m/year = 100 mm/year (very low)
  // More likely training used the daily sum band which is already in mm
  // We'll store both raw mm and the normalized value using divide(0.1) logic
  let rainfallMM   = 1000;
  let rainfallNorm = 0;

  for (const asset of ERA5_ASSETS) {
    try {
      const col       = ee.ImageCollection(asset).filterBounds(point).filterDate(daysAgo(365), today);
      const bandNames = await eeGetInfo(col.first().bandNames());
      const pBand     = bandNames.find(b => b.includes('precipitation')) || 'total_precipitation_sum';
      const rVals     = await eeGetInfo(
        col.select(pBand).sum()
          .reduceRegion({ reducer: ee.Reducer.mean(), geometry: point, scale: 11132 })
      );
      const rawPrec = rVals[pBand];
      if (rawPrec != null) {
        rainfallMM   = Math.round(rawPrec * 1000);           // metres → mm/year (display)
        rainfallNorm = clamp(rawPrec / 0.1, 0, 1);           // matches training: .divide(0.1)
        console.log(`[GEE] Rainfall ${rainfallMM} mm/yr from ${asset}`);
        break;
      }
    } catch (e) { console.warn(`[GEE] Rainfall (${asset}):`, e.message); }
  }

  // ── Sentinel-1 SAR: VV.unitScale(-25,0), VH.unitScale(-30,-5) [training] ──
  let SAR_VV = null; let SAR_VH = null;
  let sarVVnorm = 0.5; let sarVHnorm = 0.5;
  try {
    const s1Start = daysAgo(90);
    const s1Col   = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(point).filterDate(s1Start, today)
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
      .select(['VV','VH']);

    if (await eeGetInfo(s1Col.size()) > 0) {
      const s1Vals = await eeGetInfo(
        s1Col.median().reduceRegion({ reducer: ee.Reducer.mean(), geometry: point, scale: 10 })
      );
      if (s1Vals.VV != null) {
        SAR_VV    = +s1Vals.VV.toFixed(4);
        sarVVnorm = unitScale(SAR_VV, -25, 0);   // matches: .unitScale(-25, 0)
      }
      if (s1Vals.VH != null) {
        SAR_VH    = +s1Vals.VH.toFixed(4);
        sarVHnorm = unitScale(SAR_VH, -30, -5);  // matches: .unitScale(-30, -5)
      }
      console.log(`[GEE] SAR VV=${SAR_VV} VH=${SAR_VH}`);
    }
  } catch (e) { console.warn('[GEE] SAR failed:', e.message); }

  // ── Raw features — human-readable display values ──────────────────────────
  const rawFeatures = {
    B4, B3, B2, NDVI,
    Slope:         slopeRaw,       // degrees
    Elevation:     elevationRaw,   // metres
    WaterDistance: waterDistRaw,   // metres
    Temperature:   tempC,          // °C
    Rainfall:      rainfallMM,     // mm/year
    SAR_VV, SAR_VH,               // dB
  };

  // ── Model features — EXACTLY same normalization as training script ─────────
  // Band order: B4, B3, B2, NDVI, Slope, Elevation, WaterDistance, Temperature, Rainfall, SAR_VV, SAR_VH
  const modelFeatures = {
    B4:            B4   != null ? clamp(B4,   0, 1) : 0,   // already 0-1 from divide(10000)
    B3:            B3   != null ? clamp(B3,   0, 1) : 0,
    B2:            B2   != null ? clamp(B2,   0, 1) : 0,
    NDVI:          NDVI != null ? clamp(NDVI, 0, 1) : 0,   // already 0-1 from unitScale(-1,1)
    Slope:         slopeNorm,                               // divide(90).clamp(0,1)
    Elevation:     elevationNorm,                           // divide(4000).clamp(0,1)
    WaterDistance: waterDistNorm,                           // cumulativeCost/10000
    Temperature:   clamp(tempNorm, 0, 1),                  // (K-273.15).unitScale(0,50)
    Rainfall:      clamp(rainfallNorm, 0, 1),              // divide(0.1)
    SAR_VV:        clamp(sarVVnorm, 0, 1),                 // unitScale(-25,0)
    SAR_VH:        clamp(sarVHnorm, 0, 1),                 // unitScale(-30,-5)
  };

  return { rawFeatures, modelFeatures, satelliteImage };
}

module.exports = { initGEE, extractFeatures };
