import Image, { ImageProps } from "next/image";
import React, { forwardRef, useEffect, useState } from "react";
import { useRouter } from "next/router";

const fallbackImage = "/images/logo_placeholder.png";

function withBasePath(path: string, basePath: string) {
  // Ensure basePath is applied in prod (e.g., /beta)
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}

export const ImageWithFallback = forwardRef<HTMLImageElement, ImageProps>(
  ({ src, alt = "ImageWithFallback", ...props }, ref) => {
    const router = useRouter();
    const [imgSrc, setImgSrc] = useState<ImageProps["src"]>(src);

    useEffect(() => {
      setImgSrc(src);
    }, [src]);

    const handleError = () => {
      setImgSrc(withBasePath(fallbackImage, router.basePath));
    };

    return (
      <Image
        {...props}
        alt={alt}
        ref={ref}
        src={withBasePath(fallbackImage, router.basePath)}
        onError={handleError}
        placeholder="blur"
      />
    );
  }
);
