"use client";

import React from "react";

export interface FileUploadProps {
  onFileSelect?: (file: { name: string; size: string }) => void;
  onFileRemove?: () => void;
  selectedFileName?: string;
  selectedFileSize?: string;
  acceptLabel?: string;
  maxSizeLabel?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileRemove,
  selectedFileName,
  selectedFileSize,
  acceptLabel = "PNG, JPG or PDF",
  maxSizeLabel = "Max 5MB",
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleZoneClick = () => {
    if (selectedFileName) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      onFileSelect({ name: file.name, size: sizeStr });
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".png,.jpg,.jpeg,.pdf"
      />

      <div
        onClick={handleZoneClick}
        className={`relative w-full p-6 rounded-xl border-2 border-dashed bg-surface-bright transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer group ${
          selectedFileName
            ? "border-outline-variant bg-surface"
            : "border-outline hover:bg-surface-container-low"
        }`}
      >
        {!selectedFileName ? (
          <>
            <div className="w-10 h-10 rounded-full bg-secondary-container/50 text-primary flex items-center justify-center group-hover:scale-110 transition-transform select-none">
              <span className="material-symbols-outlined">upload_file</span>
            </div>
            <div className="text-center select-none">
              <p className="font-label-md text-label-md text-on-surface font-semibold">
                Click to upload document
              </p>
              <p className="font-body-sm text-body-sm text-muted-foreground mt-1">
                {acceptLabel} ({maxSizeLabel})
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between w-full px-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-outline select-none">image</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                  {selectedFileName}
                </span>
                <span className="font-body-sm text-body-sm text-success flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Ready to submit ({selectedFileSize})
                </span>
              </div>
            </div>
            {onFileRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemove();
                }}
                className="text-outline hover:text-error transition-colors p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined select-none text-[20px]">close</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
