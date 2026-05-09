export async function predict(file: File, threshold = 0.5): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("threshold", String(threshold));

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