import React from 'react';
import Image, { ImageProps } from 'next/image';

type Props = Omit<ImageProps, 'placeholder'> & {
  fallbackSrc?: string;
  blurDataURL?: string;
  priorityAboveFold?: boolean;
};

const defaultBlur =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSI3NSUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2UyZTJlMiIvPjwvc3ZnPg=='
;

const OptimizedImage: React.FC<Props> = ({
  src,
  alt,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 75,
  loading = 'lazy',
  fallbackSrc = '/images/placeholder-image-new.png',
  blurDataURL = defaultBlur,
  priorityAboveFold = false,
  ...rest
}) => {
  const [error, setError] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);

  // Ensure we only render on the client side to prevent hydration issues
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const safeSrc = !src || typeof src !== 'string' ? fallbackSrc : src;

  // Extract props that should NOT be forwarded to DOM elements
  // "fill" is a Next/Image prop and must not be written to a div
  const { fill, style, ...imgRest } = rest as ImageProps & { [key: string]: any };

  // Render a simple div on the server side to prevent hydration mismatch (avoid forwarding non-DOM props)
  if (!isClient) {
    return (
      <div 
        style={{ 
          display: 'block',
          width: '100%',
          height: '100%',
          backgroundColor: '#f0f0f0'
        }}
      />
    );
  }

  return (
    <Image
      src={error ? fallbackSrc : safeSrc}
      alt={alt}
      sizes={sizes}
      quality={quality}
      loading={priorityAboveFold ? undefined : loading}
      priority={priorityAboveFold}
      placeholder="blur"
      blurDataURL={blurDataURL}
      onError={() => setError(true)}
      {...(fill ? { fill: true } : {})}
      {...imgRest}
    />
  );
};

export default OptimizedImage;