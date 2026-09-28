"use client";

import { useRef } from "react";

export function PhotoViewer({
  src,
  alt,
  caption,
  className = "",
  imageClassName = "",
}: {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  imageClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cleanCaption = caption?.replace(/^\d{10,}[-_ ]+/, "").trim();
  const visibleCaption = cleanCaption && !/^(?:(?:photo|image|img)\s*)?\d+$/i.test(cleanCaption) ? cleanCaption : "";

  return (
    <>
      <button
        type="button"
        aria-label={`View full-size photo: ${alt}`}
        onClick={() => dialogRef.current?.showModal()}
        className={`block cursor-zoom-in overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" decoding="async" className={imageClassName} />
      </button>
      <dialog
        ref={dialogRef}
        aria-label={alt}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="photo-viewer fixed m-auto h-dvh w-screen max-h-none max-w-none overflow-hidden border-0 bg-transparent p-0 text-white backdrop:bg-black/90"
      >
        <div className="relative flex h-full w-full items-center justify-center p-3 sm:p-8">
          <button
            type="button"
            aria-label="Close photo"
            onClick={() => dialogRef.current?.close()}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/60 text-2xl text-white hover:bg-black/80"
          >
            <span aria-hidden="true">×</span>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-[calc(100dvh-2rem)] max-w-full rounded-lg object-contain shadow-2xl sm:max-h-[calc(100dvh-4rem)]" />
          {visibleCaption && <p className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] rounded-lg bg-black/65 px-4 py-2 text-sm text-white sm:bottom-7 sm:left-1/2 sm:max-w-[80vw] sm:-translate-x-1/2">{visibleCaption}</p>}
        </div>
      </dialog>
    </>
  );
}
