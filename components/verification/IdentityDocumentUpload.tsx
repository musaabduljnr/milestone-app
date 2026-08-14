"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";

export interface IdentityDocumentUploadProps {
  userId: string;
  initialFilePath: string;
  initialFileName: string;
  onUploadComplete: (photoIdPath: string, filename: string) => void;
  onBack: () => void;
  onContinue?: () => void;
}

type UploadState = "EMPTY" | "SELECTED" | "UPLOADING" | "UPLOADED" | "ERROR";

export const IdentityDocumentUpload: React.FC<IdentityDocumentUploadProps> = ({
  userId,
  initialFilePath,
  initialFileName,
  onUploadComplete,
  onBack,
  onContinue,
}) => {
  const supabase = createClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [state, setState] = React.useState<UploadState>(() => {
    return initialFilePath ? "UPLOADED" : "EMPTY";
  });
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileDetails, setFileDetails] = React.useState<{ name: string; size: string; type: string }>({
    name: initialFileName || "",
    size: "",
    type: "",
  });
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);

  // Parse size helper
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const handleFile = (file: File) => {
    setErrorMessage(null);

    // Validate type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setState("ERROR");
      setErrorMessage("Unsupported file type. Please upload a PNG, JPG, or PDF document.");
      return;
    }

    // Validate size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setState("ERROR");
      setErrorMessage("File is too large. Maximum allowed size is 5MB.");
      return;
    }

    setSelectedFile(file);
    setFileDetails({
      name: file.name,
      size: formatBytes(file.size),
      type: file.type.split("/")[1]?.toUpperCase() || "Unknown",
    });
    setState("SELECTED");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const triggerPicker = () => {
    if (state === "UPLOADING" || state === "UPLOADED") return;
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    const fileToUpload = selectedFile;
    if (!fileToUpload) return;

    setState("UPLOADING");

    try {
      const sanitizedName = fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const filePath = `${userId}/${Date.now()}_${sanitizedName}`;

      const { error } = await supabase.storage
        .from("identity-documents")
        .upload(filePath, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      setState("UPLOADED");
      onUploadComplete(filePath, fileToUpload.name);
    } catch (err) {
      console.error("Storage upload failed:", err);
      setState("ERROR");
      const message = err instanceof Error ? err.message : "Upload failed. Please check your connection and try again.";
      setErrorMessage(message);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setFileDetails({ name: "", size: "", type: "" });
    setErrorMessage(null);
    setState("EMPTY");
    onUploadComplete("", "");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      triggerPicker();
    }
  };

  return (
    <div className="flex flex-col gap-5 mt-2">
      <div>
        <h2 className="text-body-base font-bold text-on-surface">Upload photo ID</h2>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Please upload a high-quality photo or scan of your passport, driver&apos;s license, or national ID card. Ensure all text and details are clearly legible.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        className="hidden"
        accept=".png,.jpg,.jpeg,.pdf"
      />

      {/* Upload Zone container */}
      <div className="w-full">
        {state === "EMPTY" && (
          <div
            onClick={triggerPicker}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label="Upload photo ID. Drag and drop PNG, JPG, or PDF file here, or click to browse."
            className={`relative w-full p-8 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary ${
              dragActive
                ? "border-primary bg-primary-container/10"
                : "border-outline hover:border-primary/50 hover:bg-surface-container-low"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-secondary-container text-primary flex items-center justify-center group-hover:scale-110 transition-transform select-none">
              <span className="material-symbols-outlined text-[28px]">upload_file</span>
            </div>
            <div className="text-center select-none">
              <p className="font-label-md text-label-md text-on-surface font-semibold">
                Upload your ID
              </p>
              <p className="font-body-sm text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Drag and drop or click to browse
              </p>
              <p className="font-body-sm text-[10px] text-outline mt-1.5 font-medium uppercase tracking-wider">
                PNG, JPG, JPEG or PDF &bull; Max 5MB
              </p>
            </div>
          </div>
        )}

        {state === "SELECTED" && (
          <div className="p-5 rounded-xl border border-outline-variant bg-surface flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant/30 text-secondary">
                  <span className="material-symbols-outlined text-[22px]">image</span>
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="font-label-md text-label-md text-on-surface font-bold truncate">
                    {fileDetails.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                    {fileDetails.type} &bull; {fileDetails.size}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="text-outline hover:text-error transition-colors p-1.5 rounded-full hover:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Remove selected document"
              >
                <span className="material-symbols-outlined text-[20px] select-none">delete</span>
              </button>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={handleUpload}
              className="w-full h-11 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
              <span>Upload Document</span>
            </Button>
          </div>
        )}

        {state === "UPLOADING" && (
          <div className="p-8 rounded-xl border border-outline-variant bg-surface-container-lowest flex flex-col items-center justify-center gap-4 text-center">
            <Spinner size="lg" />
            <div className="max-w-xs">
              <p className="font-label-md text-label-md text-on-surface font-bold">
                Uploading document...
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                Connecting with secure document storage and saving identity records.
              </p>
            </div>
          </div>
        )}

        {state === "UPLOADED" && (
          <div className="p-5 rounded-xl border border-success/15 bg-success-container/5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-success-container/10 text-success flex items-center justify-center shrink-0 border border-success/15">
                  <span className="material-symbols-outlined text-[22px]">check_circle</span>
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="font-label-md text-label-md text-success font-bold truncate">
                    ID uploaded
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                    File: {fileDetails.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="text-outline hover:text-error transition-colors p-1.5 rounded-full hover:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Remove uploaded document"
              >
                <span className="material-symbols-outlined text-[20px] select-none">close</span>
              </button>
            </div>
          </div>
        )}

        {state === "ERROR" && (
          <div className="p-5 rounded-xl border border-error/15 bg-error-container/5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-error-container/10 text-error flex items-center justify-center shrink-0 border border-error/15">
                <span className="material-symbols-outlined text-[20px]">error</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="font-label-md text-label-md text-error font-bold">
                  Upload Error
                </span>
                <p className="text-xs text-muted-foreground mt-1 leading-normal">
                  {errorMessage || "An error occurred while uploading your document."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 mt-1 border-t border-outline-variant/10 pt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleRemove}
                className="flex-1 h-10 text-xs"
              >
                Clear File
              </Button>
              {selectedFile && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleUpload}
                  className="flex-1 h-10 text-xs"
                >
                  Retry Upload
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nav Actions */}
      <div className="flex items-center justify-end gap-3 mt-4 border-t border-outline-variant/20 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          disabled={state === "UPLOADING"}
          className="px-6 h-11"
        >
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            if (state === "UPLOADED" && onContinue) {
              onContinue();
            }
          }}
          disabled={state !== "UPLOADED"}
          className="px-6 h-11 min-w-[120px]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default IdentityDocumentUpload;
