// src/components/AssetImage.jsx
export default function AssetImage({ src, alt = "", className = "", wrapClassName = "" }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-white/15 bg-white/10 ${wrapClassName}`}>
      <img
        src={src}
        alt={alt}
        className={`block w-full object-contain ${className}`}
        loading="lazy"
      />
    </div>
  );
}
