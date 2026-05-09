# Crack Segmentation Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Next.js + FastAPI web app that accepts a crack image, runs it through RUCNet (PaddlePaddle), and returns the segmentation mask overlaid on the original image.

**Architecture:** FastAPI backend loads the RUCNet model once at startup, exposes a single `POST /predict` endpoint that returns a PNG overlay image. Next.js frontend provides drag-drop upload, calls the backend, and displays original vs overlay side-by-side.

**Tech Stack:** Python 3.9, PaddlePaddle 2.5.2 (CPU), PaddleSeg, FastAPI, Uvicorn, Pillow; Next.js 14 (App Router), TypeScript, Tailwind CSS.

---

## File Map

```
backend/
  requirements.txt      # Python deps
  rucnet.py             # Copied model definition (do not edit)
  best_model/
    model.pdparams      # Copied trained weights (do not edit)
  inference.py          # Model load, preprocess, predict, overlay
  main.py               # FastAPI app, CORS, /predict endpoint

frontend/
  package.json
  tailwind.config.ts
  app/
    layout.tsx           # Root layout, dark background
    page.tsx             # Page state machine: upload → loading → result → error
  components/
    ImageUploader.tsx    # Drag-drop / click upload with preview
    ResultView.tsx       # Side-by-side original vs overlay
    Spinner.tsx          # Loading indicator
  lib/
    api.ts               # predict(file) → Promise<string> (object URL)
```

---

## Task 1: Backend scaffolding — requirements and file copies

**Files:**
- Create: `backend/requirements.txt`
- Copy: `rucnet_crackseg9k/rucnet.py` → `backend/rucnet.py`
- Copy: `rucnet_crackseg9k/best_model/` → `backend/best_model/`

- [ ] **Step 1: Create `backend/` directory and `requirements.txt`**

```
backend/
```

`backend/requirements.txt`:
```
fastapi
uvicorn[standard]
python-multipart
pillow
paddlepaddle==2.5.2
paddleseg
```

- [ ] **Step 2: Copy model files**

```powershell
Copy-Item "rucnet_crackseg9k\rucnet.py" "backend\rucnet.py"
New-Item -ItemType Directory -Force -Path "backend\best_model"
Copy-Item "rucnet_crackseg9k\best_model\model.pdparams" "backend\best_model\model.pdparams"
```

- [ ] **Step 3: Set up Python environment and install deps**

```bash
conda create -n crackseg python=3.9 -y
conda activate crackseg
pip install paddlepaddle==2.5.2
pip install paddleseg
pip install fastapi "uvicorn[standard]" python-multipart pillow
```

- [ ] **Step 4: Verify paddle import works**

```bash
conda activate crackseg
python -c "import paddle; print(paddle.__version__)"
```

Expected output: `2.5.2`

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/rucnet.py backend/best_model/
git commit -m "feat: add backend scaffold and model files"
```

---

## Task 2: Backend — `inference.py`

**Files:**
- Create: `backend/inference.py`

- [ ] **Step 1: Write `backend/inference.py`**

```python
import io
import os
import sys

import numpy as np
import paddle
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from rucnet import RUCNet

_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "best_model", "model.pdparams")

def _load_model() -> RUCNet:
    model = RUCNet(num_classes=2)
    state = paddle.load(_MODEL_PATH)
    model.set_state_dict(state)
    model.eval()
    return model

_model = _load_model()


def _preprocess(image: Image.Image) -> paddle.Tensor:
    # Resize so H and W are multiples of 32
    w, h = image.size
    new_w = max(32, (w // 32) * 32)
    new_h = max(32, (h // 32) * 32)
    img = image.convert("RGB").resize((new_w, new_h), Image.BILINEAR)

    arr = np.array(img, dtype=np.float32) / 255.0
    arr = (arr - _MEAN) / _STD
    arr = arr.transpose(2, 0, 1)          # HWC -> CHW
    arr = arr[np.newaxis, ...]            # add batch dim
    return paddle.to_tensor(arr)


def _overlay(original: Image.Image, mask: np.ndarray) -> Image.Image:
    """Blend a red semi-transparent mask over the original image."""
    orig_rgb = original.convert("RGBA")
    mask_resized = Image.fromarray((mask * 255).astype(np.uint8), mode="L").resize(
        orig_rgb.size, Image.NEAREST
    )

    # Red overlay layer
    overlay = Image.new("RGBA", orig_rgb.size, (255, 0, 0, 0))
    red_pixels = np.array(overlay)
    red_pixels[..., 3] = np.array(mask_resized)  # alpha from mask
    red_pixels[..., 3] = (red_pixels[..., 3] > 127) * 160  # threshold + set alpha=160
    overlay = Image.fromarray(red_pixels, "RGBA")

    composited = Image.alpha_composite(orig_rgb, overlay)
    return composited.convert("RGB")


def predict(image: Image.Image) -> Image.Image:
    tensor = _preprocess(image)
    with paddle.no_grad():
        logits = _model(tensor)          # list of [1, 2, H, W]
    logit = logits[0]                    # [1, 2, H, W]
    mask = paddle.argmax(logit, axis=1)  # [1, H, W]
    mask_np = mask.numpy()[0].astype(np.uint8)  # [H, W], values 0 or 1
    return _overlay(image, mask_np)
```

- [ ] **Step 2: Smoke-test inference.py manually**

```bash
conda activate crackseg
cd backend
python -c "
from PIL import Image
import numpy as np
img = Image.fromarray(np.random.randint(0,255,(400,400,3), dtype='uint8'))
from inference import predict
out = predict(img)
print('output size:', out.size)
"
```

Expected output: `output size: (400, 400)` (no errors)

- [ ] **Step 3: Commit**

```bash
git add backend/inference.py
git commit -m "feat: add inference pipeline with overlay"
```

---

## Task 3: Backend — `main.py` (FastAPI app)

**Files:**
- Create: `backend/main.py`

- [ ] **Step 1: Write `backend/main.py`**

```python
import io

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image

from inference import predict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


@app.post("/predict")
async def predict_endpoint(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are accepted.")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    result = predict(image)

    buf = io.BytesIO()
    result.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")
```

- [ ] **Step 2: Start the server and verify it starts**

```bash
conda activate crackseg
cd backend
uvicorn main:app --reload --port 8000
```

Expected: Server starts, prints `Application startup complete.` (model loads, no import errors).

- [ ] **Step 3: Test the endpoint with curl**

In a second terminal (with server running):
```bash
# Use any JPEG image on your machine
curl -X POST http://localhost:8000/predict \
  -F "file=@path/to/any_crack_image.jpg" \
  --output test_result.png
```

Expected: `test_result.png` is created and is a valid PNG image.

- [ ] **Step 4: Commit**

```bash
git add backend/main.py
git commit -m "feat: add FastAPI predict endpoint with CORS"
```

---

## Task 4: Frontend scaffolding — Next.js + Tailwind

**Files:**
- Create: `frontend/` (via `create-next-app`)

- [ ] **Step 1: Scaffold Next.js app**

```bash
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

When prompted, accept all defaults.

- [ ] **Step 2: Verify it runs**

```bash
cd frontend
npm run dev
```

Expected: `localhost:3000` shows the default Next.js page.

- [ ] **Step 3: Clear the default page content**

Replace `frontend/app/page.tsx` with a minimal placeholder:

```tsx
export default function Home() {
  return <main className="min-h-screen bg-gray-950 text-white" />;
}
```

Replace `frontend/app/globals.css` with just:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Next.js frontend with Tailwind"
```

---

## Task 5: Frontend — `lib/api.ts`

**Files:**
- Create: `frontend/lib/api.ts`

- [ ] **Step 1: Create `frontend/lib/` and write `api.ts`**

```typescript
export async function predict(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("http://localhost:8000/predict", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Inference failed (${res.status}): ${text}`);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add predict API wrapper"
```

---

## Task 6: Frontend — `Spinner.tsx`

**Files:**
- Create: `frontend/components/Spinner.tsx`

- [ ] **Step 1: Create `frontend/components/` and write `Spinner.tsx`**

```tsx
export default function Spinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-600 border-t-red-500" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/Spinner.tsx
git commit -m "feat: add Spinner component"
```

---

## Task 7: Frontend — `ImageUploader.tsx`

**Files:**
- Create: `frontend/components/ImageUploader.tsx`

- [ ] **Step 1: Write `frontend/components/ImageUploader.tsx`**

```tsx
"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import Image from "next/image";

interface Props {
  onFileSelected: (file: File) => void;
}

export default function ImageUploader({ onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    onFileSelected(file);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-colors cursor-pointer
        ${dragging ? "border-red-400 bg-gray-800" : "border-gray-600 bg-gray-900 hover:border-gray-400"}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={onChange}
      />

      {preview ? (
        <Image
          src={preview}
          alt="Selected image preview"
          width={300}
          height={300}
          className="rounded-lg object-contain max-h-64"
        />
      ) : (
        <>
          <svg className="mb-4 h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 16.5V19a2 2 0 002 2h14a2 2 0 002-2v-2.5M16 9l-4-4m0 0L8 9m4-4v12" />
          </svg>
          <p className="text-gray-400 text-sm">Drag & drop or click to upload</p>
          <p className="text-gray-600 text-xs mt-1">JPG or PNG</p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ImageUploader.tsx
git commit -m "feat: add ImageUploader component with drag-drop"
```

---

## Task 8: Frontend — `ResultView.tsx`

**Files:**
- Create: `frontend/components/ResultView.tsx`

- [ ] **Step 1: Write `frontend/components/ResultView.tsx`**

```tsx
"use client";

import Image from "next/image";

interface Props {
  originalUrl: string;
  overlayUrl: string;
  onReset: () => void;
}

export default function ResultView({ originalUrl, overlayUrl, onReset }: Props) {
  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <div className="flex flex-col gap-2">
          <p className="text-gray-400 text-sm uppercase tracking-widest text-center">Original</p>
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-900">
            <Image src={originalUrl} alt="Original image" fill className="object-contain" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-red-400 text-sm uppercase tracking-widest text-center">Crack Segmentation</p>
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-900">
            <Image src={overlayUrl} alt="Segmentation overlay" fill className="object-contain" />
          </div>
        </div>
      </div>

      <button
        onClick={onReset}
        className="px-6 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm"
      >
        Upload another
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ResultView.tsx
git commit -m "feat: add ResultView component side-by-side"
```

---

## Task 9: Frontend — `app/layout.tsx` and `app/page.tsx`

**Files:**
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: Write `frontend/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CrackSeg — RUCNet Demo",
  description: "Crack segmentation using RUCNet trained on CrackSeg9k",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Write `frontend/app/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ResultView from "@/components/ResultView";
import Spinner from "@/components/Spinner";
import { predict } from "@/lib/api";

type State = "idle" | "loading" | "result" | "error";

export default function Home() {
  const [state, setState] = useState<State>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [overlayUrl, setOverlayUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  function handleFileSelected(file: File) {
    setSelectedFile(file);
    setOriginalUrl(URL.createObjectURL(file));
    setState("idle");
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    setState("loading");
    setError("");
    try {
      const url = await predict(selectedFile);
      setOverlayUrl(url);
      setState("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }

  function handleReset() {
    setSelectedFile(null);
    setOriginalUrl("");
    setOverlayUrl("");
    setError("");
    setState("idle");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start py-16 px-4">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">CrackSeg</h1>
        <p className="mt-2 text-gray-400 text-sm">
          RUCNet · CrackSeg9k · Semantic segmentation demo
        </p>
      </div>

      {state === "result" ? (
        <ResultView
          originalUrl={originalUrl}
          overlayUrl={overlayUrl}
          onReset={handleReset}
        />
      ) : (
        <div className="w-full max-w-md flex flex-col gap-6">
          <ImageUploader onFileSelected={handleFileSelected} />

          {selectedFile && state !== "loading" && (
            <button
              onClick={handleAnalyze}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold transition-colors"
            >
              Analyze
            </button>
          )}

          {state === "loading" && <Spinner />}

          {state === "error" && (
            <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-red-300 text-sm">
              {error}
              <button
                onClick={handleAnalyze}
                className="ml-3 underline hover:text-red-100"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Allow `localhost:8000` images in `next.config.ts`**

Open `frontend/next.config.ts` (or `next.config.js`) and replace its content with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
```

Note: Since overlay images are `blob:` URLs (object URLs created client-side), no remote pattern is needed. The `next/image` `src` for blob URLs works without config changes. Leave the config as-is if it was already minimal.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/layout.tsx frontend/app/page.tsx frontend/next.config.ts
git commit -m "feat: add main page with upload/loading/result/error states"
```

---

## Task 10: End-to-end smoke test

- [ ] **Step 1: Start the backend**

```bash
# Terminal 1
conda activate crackseg
cd backend
uvicorn main:app --reload --port 8000
```

Wait for `Application startup complete.`

- [ ] **Step 2: Start the frontend**

```bash
# Terminal 2
cd frontend
npm run dev
```

Wait for `Local: http://localhost:3000`

- [ ] **Step 3: Open the app and test the happy path**

1. Open `http://localhost:3000`
2. Drag or click to upload a crack image (JPG or PNG)
3. Thumbnail appears, "Analyze" button appears
4. Click "Analyze" — spinner shows
5. Result view appears with original on left, red overlay on right
6. Click "Upload another" — resets to upload state

- [ ] **Step 4: Test the error path**

1. Stop the backend server (Ctrl+C in Terminal 1)
2. Upload an image and click "Analyze"
3. Error message should appear: `Inference failed (...)` with a Retry button
4. Restart backend, click Retry — should succeed

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete crack segmentation web app"
```

---

## Environment Reference

| What | Command |
|------|---------|
| Activate Python env | `conda activate crackseg` |
| Start backend | `cd backend && uvicorn main:app --reload --port 8000` |
| Start frontend | `cd frontend && npm run dev` |
| Backend URL | `http://localhost:8000` |
| Frontend URL | `http://localhost:3000` |
