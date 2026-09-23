// 📖 Design source: Figma 1276:566 (node 1312:301) / 2149:5 (node 2149:36)

/**
 * The exported arrow, used by both boards' text links. The path data is kept
 * verbatim so the head geometry is unchanged; `currentColor` replaces the
 * baked-in fill so the colour comes from a token on the consumer.
 */
export const ArrowGlyph = () => {
  return (
    <span className="flex size-2 items-center justify-center">
      <span className="flex -rotate-45 items-center justify-center">
        <svg
          viewBox="0 0 12.2137 13.2551"
          fill="none"
          aria-hidden="true"
          focusable="false"
          className="block w-(--size-arrow-width) h-(--size-arrow-height)"
        >
          <path
            d="M11.9501 7.26396C12.3016 6.91249 12.3016 6.34264 11.9501 5.99117L6.22254 0.263604C5.87107 -0.0878682 5.30122 -0.0878682 4.94975 0.263604C4.59828 0.615076 4.59828 1.18492 4.94975 1.5364L10.0409 6.62756L4.94975 11.7187C4.59828 12.0702 4.59828 12.6401 4.94975 12.9915C5.30122 13.343 5.87107 13.343 6.22254 12.9915L11.9501 7.26396ZM0 6.62756V7.52756H11.3137V6.62756V5.72756H0V6.62756Z"
            fill="currentColor"
          />
        </svg>
      </span>
    </span>
  );
};
