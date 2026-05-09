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


_TRAIN_SIZE = (400, 400)  # matches RandomPaddingCrop in training config


def _preprocess(image: Image.Image) -> paddle.Tensor:
    img = image.convert("RGB").resize(_TRAIN_SIZE, Image.Resampling.BILINEAR)

    arr = np.array(img, dtype=np.float32) / 255.0
    arr = (arr - _MEAN) / _STD
    arr = arr.transpose(2, 0, 1)  # HWC -> CHW
    arr = arr[np.newaxis, ...]    # add batch dim
    return paddle.to_tensor(arr)


def _overlay(original: Image.Image, mask: np.ndarray) -> Image.Image:
    """Blend a red semi-transparent mask over the original image. mask is already original size."""
    orig_rgb = original.convert("RGBA")

    overlay = Image.new("RGBA", orig_rgb.size, (255, 0, 0, 0))
    red_pixels = np.array(overlay)
    red_pixels[..., 3] = mask * 160  # crack pixels get alpha=160, background stays 0
    overlay = Image.fromarray(red_pixels, "RGBA")

    composited = Image.alpha_composite(orig_rgb, overlay)
    return composited.convert("RGB")


def predict(image: Image.Image, threshold: float = 0.5) -> Image.Image:
    original_size = image.size  # (W, H) — save before any resizing
    tensor = _preprocess(image)
    with paddle.no_grad():
        logits = _model(tensor)                           # list of [1, 2, H, W]
    logit = logits[0]                                     # [1, 2, H, W]
    prob = paddle.nn.functional.softmax(logit, axis=1)   # [1, 2, H, W]
    crack_prob = prob[0, 1].numpy()                       # [H, W] at 400×400
    mask_np = (crack_prob >= threshold).astype(np.uint8)  # [H, W], 0 or 1

    # Scale mask back to original image dimensions before overlaying
    mask_img = Image.fromarray(mask_np * 255, mode="L").resize(
        original_size, Image.Resampling.NEAREST
    )
    mask_np_full = (np.array(mask_img) > 127).astype(np.uint8)

    return _overlay(image, mask_np_full)
