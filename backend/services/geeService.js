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
 *   Rainfall    → total_precipitation_sum.sum() / 3.0 (3000mm/yr max) .clamp(0,1)
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

  // ── ERA5 Rainfall: normalised over India's realistic range 0–4000 mm/yr ─────
  // ERA5 total_precipitation_sum is in metres/day per image.
  // .sum() over 365 images gives metres/year total.
  // India range: ~50mm/yr (Jaisalmer) to ~11000mm/yr (Cherrapunji).
  // We use 0–3000mm/yr (0–3.0m) as the practical 0-1 scale so that:
  //   Jaisalmer  ~124mm  → 124/3000 = 0.04 (very dry → low norm)
  //   Mahabaleshwar ~2300mm → 2300/3000 = 0.77 (high rainfall → high norm)
  //   Cherrapunji ~11000mm → clamped to 1.0
  const RAINFALL_MAX_M = 3.0;   // 3000 mm/yr in metres
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
        rainfallNorm = clamp(rawPrec / RAINFALL_MAX_M, 0, 1); // 0–3000mm/yr → 0–1
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
    B4:            B4   != null ? clamp(B4,   0, 1) : 0,
    B3:            B3   != null ? clamp(B3,   0, 1) : 0,
    B2:            B2   != null ? clamp(B2,   0, 1) : 0,
    NDVI:          NDVI != null ? clamp(NDVI, 0, 1) : 0,
    Slope:         slopeNorm,
    Elevation:     elevationNorm,
    WaterDistance: waterDistNorm,
    Temperature:   clamp(tempNorm, 0, 1),
    Rainfall:      clamp(rainfallNorm, 0, 1),
    SAR_VV:        clamp(sarVVnorm, 0, 1),
    SAR_VH:        clamp(sarVHnorm, 0, 1),
  };

  // ── Download real 11-band image patch (256×256) for U-Net inference ────────
  let imagePatch = null;
  try {
    const PATCH_SIZE = 256;

    // Build the 11-band normalised image (same as training order)
    const b4Norm   = s2Raw.select('B4').divide(10000).clamp(0, 1).rename('B4');
    const b3Norm   = s2Raw.select('B3').divide(10000).clamp(0, 1).rename('B3');
    const b2Norm   = s2Raw.select('B2').divide(10000).clamp(0, 1).rename('B2');
    const ndviNorm = s2Raw.normalizedDifference(['B8','B4']).unitScale(-1,1).clamp(0,1).rename('NDVI');
    const slopeN   = slopeImg.divide(90).clamp(0,1).rename('Slope');
    const elevN    = dem.divide(4000).clamp(0,1).rename('Elevation');

    const waterMaskP = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
      .select('occurrence').unmask(0).gt(50).selfMask();
    const waterN = ee.Image(1).cumulativeCost({
      source: waterMaskP, maxDistance: 10000,
    }).unmask(10000).divide(10000).clamp(0,1).rename('WaterDist');

    const era5Asset = ERA5_ASSETS[0];
    const era5Col   = ee.ImageCollection(era5Asset).filterBounds(region).filterDate(daysAgo(365), today);
    const tempN     = era5Col.select('temperature_2m').mean()
                        .subtract(273.15).divide(50).clamp(0,1).rename('Temp');
    const rainN     = era5Col.select('total_precipitation_sum').sum()
                        .divide(RAINFALL_MAX_M).clamp(0,1).rename('Rain');

    const s1ColP = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(region).filterDate(daysAgo(90), today)
      .filter(ee.Filter.eq('instrumentMode','IW'))
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VV'))
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VH'))
      .select(['VV','VH']);
    const s1SizeP = await eeGetInfo(s1ColP.size());
    const sarVVN  = s1SizeP > 0
      ? s1ColP.median().select('VV').unitScale(-25,0).clamp(0,1).rename('SAR_VV')
      : ee.Image.constant(sarVVnorm).rename('SAR_VV');
    const sarVHN  = s1SizeP > 0
      ? s1ColP.median().select('VH').unitScale(-30,-5).clamp(0,1).rename('SAR_VH')
      : ee.Image.constant(sarVHnorm).rename('SAR_VH');

    // Stack all 11 bands in training order
    const stack = b4Norm
      .addBands(b3Norm).addBands(b2Norm).addBands(ndviNorm)
      .addBands(slopeN).addBands(elevN).addBands(waterN)
      .addBands(tempN).addBands(rainN)
      .addBands(sarVVN).addBands(sarVHN);

    // sampleRectangle at 15m scale → gives ~256×256 pixels across 3840m region
    // (3840m / 15m ≈ 256 pixels)
    const bandNames = ['B4','B3','B2','NDVI','Slope','Elevation','WaterDist','Temp','Rain','SAR_VV','SAR_VH'];
    const sampled   = await eeGetInfo(
      stack.reproject({ crs: 'EPSG:4326', scale: 30 })
           .sampleRectangle({ region, defaultValue: 0 })
    );

    if (sampled && sampled.properties) {
      const props = sampled.properties;
      const allOk = bandNames.every(b => Array.isArray(props[b]) && props[b].length > 0);
      if (allOk) {
        const flat = [];
        for (const b of bandNames) {
          const arr2d = props[b];
          for (const row of arr2d) {
            for (const val of row) flat.push(val != null ? val : 0);
          }
        }
        const h = props[bandNames[0]].length;
        const w = props[bandNames[0]][0].length;
        imagePatch = { data: flat, bands: 11, pixels: h * w, side: Math.max(h, w) };
        console.log(`[GEE] Real image patch: ${h}×${w} pixels, 11 bands`);
      }
    }
  } catch (e) {
    console.warn('[GEE] Image patch extraction failed, using scalar fallback:', e.message);
  }

  return { rawFeatures, modelFeatures, satelliteImage, imagePatch };
}

module.exports = { initGEE, extractFeatures };
