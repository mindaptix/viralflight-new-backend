"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_WIDTH = 1000;
const MAX_HEIGHT = 540;
const MAX_ENCODED_LENGTH = 750_000;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function resizeImage(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("The selected file is not a valid image."));
    element.src = source;
  });

  const scale = Math.min(1, MAX_WIDTH / image.width, MAX_HEIGHT / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable in this browser.");
  context.drawImage(image, 0, 0, width, height);
  let quality = 0.82;
  let result = canvas.toDataURL("image/jpeg", quality);
  while (result.length > MAX_ENCODED_LENGTH && quality > 0.5) {
    quality -= 0.08;
    result = canvas.toDataURL("image/jpeg", quality);
  }
  return result;
}

export function CommunityCoverUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function choose(file?: File) {
    if (!file) return;
    setError("");
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    setProcessing(true);
    try {
      setImageUrl(await resizeImage(file));
      setFileName(file.name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not process this image.");
    } finally {
      setProcessing(false);
    }
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    void choose(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void choose(event.dataTransfer.files?.[0]);
  }

  function clear() {
    setImageUrl("");
    setFileName("");
    setError("");
  }

  return (
    <div className="community-cover-field wide">
      <span className="community-cover-label">Cover image</span>
      <input name="imageUrl" readOnly type="hidden" value={imageUrl} />
      <input
        ref={inputRef}
        accept="image/jpeg,image/png,image/webp"
        className="community-cover-file-input"
        onChange={onChange}
        type="file"
      />

      {imageUrl ? (
        <div className="community-cover-preview">
          <img alt="Community cover preview" src={imageUrl} />
          <div className="community-cover-preview-copy">
            <strong>{fileName}</strong>
            <span>Ready to use as the community cover</span>
            <div>
              <button onClick={() => inputRef.current?.click()} type="button">
                Replace image
              </button>
              <button className="danger" onClick={clear} type="button">
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`community-cover-dropzone${dragging ? " dragging" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
          }}
        >
          <span aria-hidden className="community-cover-upload-icon">↥</span>
          <strong>{processing ? "Preparing image…" : "Upload cover image"}</strong>
          <small>Click or drag and drop · JPG, PNG or WebP · max 5 MB</small>
        </div>
      )}
      {error ? <span className="community-cover-error">{error}</span> : null}
    </div>
  );
}
