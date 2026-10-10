"""
Inference script — Attention U-Net ONLY (no Random Forest).

Uses the real 11-band GEE image patch when available.
Falls back to scalar-tiled patch with noise when patch not available.

3-class encoding (matches training mask):
  0 = BLACK  = Not Suitable
  1 = YELLOW = Moderately Suitable
  2 = GREEN  = Suitable

Input (stdin JSON):
{
  "features":    [f1..f11],           # 11 normalised scalar features
  "image_patch": {                    # optional — real GEE pixel array
    "data":   [flat pixel values],    # length = bands * pixels
    "bands":  11,
    "pixels": N,
    "side":   sqrt(N)
  }
}

Output:
{
  "score":             0.85,
  "class_id":          2,
  "predicted_class":   "Suitable",
  "probabilities":     {"Not Suitable": 0.05, ...},
  "segmentation_image": "data:image/png;base64,..."
}
"""

import sys, json, os, base64, io
import numpy as np

MODEL_DIR  = os.path.dirname(os.path.abspath(__file__))
UNET_PATH  = os.path.join(MODEL_DIR, 'attention_unet_dice_ce_best.pth')

CLASS_NAMES   = ['Not Suitable', 'Moderately Suitable', 'Suitable']
CLASS_WEIGHTS = [0.0, 0.5, 1.0]

# RGBA colors for segmentation PNG
CLASS_RGBA = [
    ( 17,  24,  39, 220),   # 0 Not Suitable        — dark charcoal/black
    (234, 179,   8, 220),   # 1 Moderately Suitable — yellow
    ( 22, 163,  74, 220),   # 2 Suitable            — green
]

PATCH_SIZE = 256


# ── Architecture (exact key names matching .pth) ──────────────────────────────
import torch
import torch.nn as nn
import torch.nn.functional as F


class DoubleConv(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch), nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch), nn.ReLU(inplace=True),
        )
    def forward(self, x): return self.conv(x)


class AttentionGate(nn.Module):
    def __init__(self, F_g, F_l, F_int):
        super().__init__()
        self.W_g = nn.Sequential(nn.Conv2d(F_g, F_int, 1), nn.BatchNorm2d(F_int))
        self.W_x = nn.Sequential(nn.Conv2d(F_l, F_int, 1), nn.BatchNorm2d(F_int))
        self.psi = nn.Sequential(nn.Conv2d(F_int, 1, 1), nn.BatchNorm2d(1), nn.Sigmoid())
    def forward(self, g, x):
        return x * self.psi(F.relu(self.W_g(g) + self.W_x(x), inplace=True))


class AttentionUNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.enc1 = DoubleConv(11, 32);  self.enc2 = DoubleConv(32, 64)
        self.enc3 = DoubleConv(64, 128); self.enc4 = DoubleConv(128, 256)
        self.pool = nn.MaxPool2d(2, 2)
        self.bottleneck = DoubleConv(256, 512)
        self.att4 = AttentionGate(256, 256, 128)
        self.att3 = AttentionGate(128, 128, 64)
        self.att2 = AttentionGate(64,  64,  32)
        self.att1 = AttentionGate(32,  32,  16)
        self.up4 = nn.ConvTranspose2d(512, 256, 2, 2); self.dec4 = DoubleConv(512, 256)
        self.up3 = nn.ConvTranspose2d(256, 128, 2, 2); self.dec3 = DoubleConv(256, 128)
        self.up2 = nn.ConvTranspose2d(128,  64, 2, 2); self.dec2 = DoubleConv(128,  64)
        self.up1 = nn.ConvTranspose2d( 64,  32, 2, 2); self.dec1 = DoubleConv( 64,  32)
        self.final = nn.Conv2d(32, 3, 1)

    def forward(self, x):
        e1 = self.enc1(x);            e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2)); e4 = self.enc4(self.pool(e3))
        b  = self.bottleneck(self.pool(e4))
        d4 = self.up4(b);  d4 = self.dec4(torch.cat([d4, self.att4(d4, e4)], 1))
        d3 = self.up3(d4); d3 = self.dec3(torch.cat([d3, self.att3(d3, e3)], 1))
        d2 = self.up2(d3); d2 = self.dec2(torch.cat([d2, self.att2(d2, e2)], 1))
        d1 = self.up1(d2); d1 = self.dec1(torch.cat([d1, self.att1(d1, e1)], 1))
        return self.final(d1)


def load_model():
    model = AttentionUNet()
    state = torch.load(UNET_PATH, map_location='cpu', weights_only=True)
    model.load_state_dict(state)
    model.eval()
    return model


def build_patch_from_real(image_patch):
    """
    Reconstruct [1, 11, 256, 256] tensor from real GEE sampleRectangle output.
    image_patch = { data: [band0_flat, band1_flat, ...], bands: 11, pixels: H*W, side: max(H,W) }
    data is stored band-by-band, each band flattened row-by-row.
    """
    data   = np.array(image_patch['data'], dtype=np.float32)
    n      = image_patch['pixels']       # H * W
    side   = image_patch['side']         # max(H, W)

    # Infer H and W — side is max(H,W), pixels = H*W
    # If square: H=W=sqrt(n), else use side as W and n/side as H
    w = min(side, PATCH_SIZE)
    h = min(n // max(w, 1), PATCH_SIZE)
    if h == 0: h = w  # fallback to square

    patch = np.zeros((11, PATCH_SIZE, PATCH_SIZE), dtype=np.float32)

    for b in range(11):
        offset    = b * n
        band_flat = data[offset : offset + n]
        band_flat = np.nan_to_num(band_flat, nan=0.0, posinf=1.0, neginf=0.0)
        band_flat = np.clip(band_flat, 0, 1)

        # Reshape to (h, w)
        actual_pixels = min(len(band_flat), h * w)
        if actual_pixels < h * w:
            padded = np.zeros(h * w, dtype=np.float32)
            padded[:actual_pixels] = band_flat[:actual_pixels]
            band_flat = padded

        grid = band_flat[:h * w].reshape(h, w)

        # Resize to PATCH_SIZE × PATCH_SIZE using repeat
        if h < PATCH_SIZE or w < PATCH_SIZE:
            rh = max(1, PATCH_SIZE // h + 1)
            rw = max(1, PATCH_SIZE // w + 1)
            grid = np.repeat(np.repeat(grid, rh, axis=0), rw, axis=1)

        patch[b] = grid[:PATCH_SIZE, :PATCH_SIZE]

    return torch.from_numpy(patch).unsqueeze(0)  # (1,11,256,256)


def build_patch_from_scalars(features):
    """
    Fallback: tile scalar features with structured spatial noise.
    Produces realistic-looking spatial variation for the U-Net.
    """
    arr = np.array(features, dtype=np.float32)
    rng = np.random.RandomState(int(abs(sum(f * 1000 for f in features))) % 2**31)

    patch = np.zeros((11, PATCH_SIZE, PATCH_SIZE), dtype=np.float32)
    for c in range(11):
        # Low-frequency noise pattern (32×32 upsampled to 256×256)
        noise = rng.randn(32, 32).astype(np.float32)
        noise_up = np.repeat(np.repeat(noise, 8, axis=0), 8, axis=1)
        noise_up = (noise_up - noise_up.min()) / (noise_up.max() - noise_up.min() + 1e-8)
        # 70% base value + 30% spatially varied
        patch[c] = np.clip(arr[c] * 0.70 + noise_up * arr[c] * 0.55, 0, 1)

    return torch.from_numpy(patch).unsqueeze(0)


def run_inference(features, image_patch=None):
    model = load_model()

    # Use real GEE patch if available, otherwise fall back to scalar patch
    if image_patch and image_patch.get('pixels', 0) > 0:
        tensor = build_patch_from_real(image_patch)
        print('[infer] Using real GEE image patch', file=sys.stderr)
    else:
        tensor = build_patch_from_scalars(features)
        print('[infer] Using scalar fallback patch', file=sys.stderr)

    with torch.no_grad():
        logits = model(tensor)              # (1, 3, 256, 256)
        probs  = F.softmax(logits, dim=1)   # (1, 3, 256, 256)
        pred   = torch.argmax(probs, dim=1)[0].numpy()  # (256, 256)

    # ── Score: mean pixel probability of each class ──────────────────────────
    mean_probs = probs[0].mean(dim=(1, 2)).numpy()  # (3,)
    score      = float(sum(w * p for w, p in zip(CLASS_WEIGHTS, mean_probs)))
    class_id   = int(np.argmax(mean_probs))

    # ── Segmentation PNG ─────────────────────────────────────────────────────
    from PIL import Image as PILImage
    rgba = np.zeros((PATCH_SIZE, PATCH_SIZE, 4), dtype=np.uint8)
    for cls_id, color in enumerate(CLASS_RGBA):
        rgba[pred == cls_id] = color

    img = PILImage.fromarray(rgba, 'RGBA')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    seg_b64 = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('utf-8')

    return {
        'score':             round(score, 4),
        'class_id':          class_id,
        'predicted_class':   CLASS_NAMES[class_id],
        'probabilities':     {CLASS_NAMES[i]: round(float(mean_probs[i]), 4) for i in range(3)},
        'segmentation_image': seg_b64,
    }


def main():
    try:
        data        = json.loads(sys.stdin.read().strip())
        features    = data['features']
        image_patch = data.get('image_patch', None)

        if len(features) != 11:
            raise ValueError(f'Expected 11 features, got {len(features)}')

        result = run_inference(features, image_patch)
        print(json.dumps(result))

    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
