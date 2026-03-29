"use client";

import { ImagePlus, RefreshCcw, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { resolveMenuImageURL } from "@/lib/media";

const acceptedFileTypes = ["image/jpeg", "image/png", "image/webp"];

type MenuImageUploadFieldProps = {
    file: File | null;
    currentImageURL?: string;
    removeExisting?: boolean;
    disabled?: boolean;
    onFileChange: (file: File | null) => void;
    onRemoveExistingChange?: (removeExisting: boolean) => void;
};

export default function MenuImageUploadField({
    file,
    currentImageURL = "",
    removeExisting = false,
    disabled = false,
    onFileChange,
    onRemoveExistingChange
}: MenuImageUploadFieldProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState("");
    const previewURL = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

    useEffect(() => {
        return () => {
            if (previewURL) {
                URL.revokeObjectURL(previewURL);
            }
        };
    }, [previewURL]);

    const resolvedExistingImageURL = useMemo(() => resolveMenuImageURL(currentImageURL), [currentImageURL]);
    const visiblePreview = previewURL || (!removeExisting ? resolvedExistingImageURL : "");
    const hasExistingImage = Boolean(resolvedExistingImageURL) && !removeExisting;

    function openFilePicker() {
        if (disabled) {
            return;
        }
        inputRef.current?.click();
    }

    function clearInputValue() {
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    }

    function applyFile(nextFile: File | null) {
        if (!nextFile) {
            return;
        }
        if (!acceptedFileTypes.includes(nextFile.type)) {
            setError("Only JPG, PNG, and WEBP images are supported.");
            clearInputValue();
            return;
        }

        setError("");
        onRemoveExistingChange?.(false);
        onFileChange(nextFile);
        clearInputValue();
    }

    function handleDrop(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);

        if (disabled) {
            return;
        }

        applyFile(event.dataTransfer.files?.[0] ?? null);
    }

    return (
        <div className="space-y-3">
            <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={disabled}
                onChange={(event) => applyFile(event.target.files?.[0] ?? null)}
            />

            <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">Item Image</label>
                <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    onClick={openFilePicker}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openFilePicker();
                        }
                    }}
                    onDragEnter={(event) => {
                        event.preventDefault();
                        if (!disabled) {
                            setIsDragging(true);
                        }
                    }}
                    onDragLeave={(event) => {
                        event.preventDefault();
                        if (event.currentTarget === event.target) {
                            setIsDragging(false);
                        }
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                    className={`group relative overflow-hidden rounded-2xl border border-dashed bg-slate-950/55 p-3 transition sm:p-4 ${disabled
                        ? "cursor-not-allowed border-white/10 opacity-70"
                        : isDragging
                            ? "cursor-pointer border-cyan-300/60 bg-cyan-500/10"
                            : "cursor-pointer border-white/10 hover:border-cyan-300/40 hover:bg-slate-900/70"
                        }`}
                >
                    {visiblePreview ? (
                        <div className="space-y-3">
                            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={visiblePreview} alt="Menu item preview" className="h-40 w-full object-cover sm:h-52" />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <ImagePlus className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                                <span>{file ? file.name : "Current item image"}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-slate-900/55 px-4 py-5 text-center sm:min-h-52 sm:px-6">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-200">
                                <UploadCloud className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-100">Drop an image here or click to upload</p>
                                <p className="text-xs text-slate-400">Supports JPG, PNG, and WEBP.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {removeExisting && !file && resolvedExistingImageURL ? (
                <p className="text-xs text-amber-300">The current image will be removed when you save.</p>
            ) : null}

            {error ? <p className="text-xs text-rose-300">{error}</p> : null}

            <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" className="w-full sm:w-auto" onClick={openFilePicker} disabled={disabled}>
                    {visiblePreview ? "Replace Image" : "Choose Image"}
                </Button>

                {file ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="w-full sm:w-auto"
                        onClick={() => {
                            onFileChange(null);
                            setError("");
                            clearInputValue();
                        }}
                        disabled={disabled}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove Selection
                    </Button>
                ) : null}

                {hasExistingImage ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="w-full sm:w-auto"
                        onClick={() => {
                            onRemoveExistingChange?.(true);
                            setError("");
                        }}
                        disabled={disabled}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove Image
                    </Button>
                ) : null}

                {removeExisting && !file && resolvedExistingImageURL ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="w-full sm:w-auto"
                        onClick={() => onRemoveExistingChange?.(false)}
                        disabled={disabled}
                    >
                        <RefreshCcw className="h-4 w-4" aria-hidden="true" /> Undo Remove
                    </Button>
                ) : null}
            </div>
        </div>
    );
}