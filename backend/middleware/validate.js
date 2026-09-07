/**
 * Request validation middleware for POST /api/predict
 */

function validatePredictRequest(req, res, next) {
  const { latitude, longitude } = req.body;

  if (latitude === undefined || latitude === null || latitude === '') {
    return res.status(400).json({ success: false, error: 'latitude is required.' });
  }
  if (longitude === undefined || longitude === null || longitude === '') {
    return res.status(400).json({ success: false, error: 'longitude is required.' });
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (isNaN(lat)) {
    return res.status(400).json({ success: false, error: 'latitude must be a number.' });
  }
  if (isNaN(lng)) {
    return res.status(400).json({ success: false, error: 'longitude must be a number.' });
  }
  if (lat < -90 || lat > 90) {
    return res.status(400).json({ success: false, error: 'latitude must be between -90 and 90.' });
  }
  if (lng < -180 || lng > 180) {
    return res.status(400).json({ success: false, error: 'longitude must be between -180 and 180.' });
  }

  // Attach parsed numbers for route handlers
  req.coords = { lat, lng };
  next();
}

module.exports = { validatePredictRequest };
