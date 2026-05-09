# Crack Segmentation Web App — Design Spec

**Date:** 2026-05-09  
**Status:** Approved  

---

## Overview

A local-only portfolio demo web app that takes a crack image from the user, runs it through the trained RUCNet model (PaddlePaddle), and returns the segmentation mask overlaid on the original image.

- **Frontend:** Next.js on `localhost:3000`
- **Backend:** FastAPI on `localhost:8000`
- **Model:** RUCNet trained on CrackSeg9k, weights at `best_model/model.pdparams`

---

## Architecture

```
User Browser (Next.js :3000)
        |
        | POST /predict  (multipart/form-data, image file)
        v
FastAPI Server (:8000)
        |
        | model loaded once at startup (kept in memory)
        | preprocess → forward pass → argmax → blend overlay
        v
Returns PNG overlay image (binary response)
        |
        v
Next.js displays: original image | overlay image side-by-side
```

No database. No auth. No persistent state. Pure request/response.

---

## Backend

### File Structure

```
backend/
  main.py           # FastAPI app + /predict endpoint + CORS
  inference.py      # Model load + preprocessing + inference + overlay
  rucnet.py         # Copied from rucnet_crackseg9k/ (model definition)
  best_model/
    model.pdparams  # Copied from rucnet_crackseg9k/best_model/
  requirements.txt
```

### `inference.py`

- Loads `RUCNet(num_classes=2)` from `rucnet.py` at module import time
- Calls `paddle.load` on `best_model/model.pdparams` and sets model to eval mode
- `preprocess(image: PIL.Image) -> paddle.Tensor`: resize to nearest multiple of 32, normalize with ImageNet mean/std (matching val transforms in yml — just Normalize), add batch dim
- `predict(image: PIL.Image) -> PIL.Image`:
  - Runs forward pass → logit list → take first → argmax on channel dim → binary mask (0 or 1)
  - Converts mask to red semi-transparent overlay (RGBA, alpha=128) using Pillow
  - Composites overlay onto original image
  - Returns composited PIL Image

### `main.py`

- `POST /predict`: accepts `UploadFile`, reads bytes → PIL Image → calls `predict()` → returns `StreamingResponse` with `image/png` content type
- CORS middleware: allow origin `http://localhost:3000`, methods `POST`, headers `*`
- No other endpoints needed

### `requirements.txt`

```
fastapi
uvicorn[standard]
python-multipart
pillow
paddlepaddle==2.5.2   # CPU version
paddleseg
```

---

## Frontend

### File Structure

```
frontend/
  app/
    page.tsx          # Single page — upload + result
    layout.tsx        # Root layout
  components/
    ImageUploader.tsx  # Drag-drop / click upload + preview
    ResultView.tsx     # Side-by-side original vs overlay
    Spinner.tsx        # Loading state
  lib/
    api.ts            # POST /predict fetch wrapper
```

### Page Flow

1. **Initial state:** Centered upload area — drag-and-drop zone or click to browse. Accepts JPG/PNG.
2. **File selected:** Preview thumbnail shown. "Analyze" button appears.
3. **Loading state:** Spinner replaces button while fetch is in flight.
4. **Result state:** Side-by-side view — left: original image, right: overlay. "Upload another" button resets to initial state.
5. **Error state:** If backend returns non-200 or fetch fails, show inline error message with retry option.

### API call (`lib/api.ts`)

```ts
export async function predict(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('http://localhost:8000/predict', { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Inference failed: ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
```

### Styling

Tailwind CSS. Clean dark theme. No component libraries — hand-crafted for portfolio quality.

---

## Dev Setup

### 1. Python environment

```bash
conda create -n crackseg python=3.9
conda activate crackseg
pip install paddlepaddle==2.5.2   # CPU
pip install paddleseg
pip install fastapi uvicorn[standard] python-multipart pillow
```

### 2. Copy model files into backend

```bash
cp rucnet_crackseg9k/rucnet.py backend/
cp -r rucnet_crackseg9k/best_model backend/
```

### 3. Start backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 4. Start frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## Out of Scope

- Batch processing
- Result history / logging
- Authentication
- Cloud deployment
- Metrics (crack area %, confidence scores)
- Model hot-swapping
