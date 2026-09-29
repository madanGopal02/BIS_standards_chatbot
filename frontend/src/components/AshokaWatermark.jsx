/**
 * Decorative Ashoka Lion Capital *inspired* watermark.
 *
 * This is an original, abstract geometric composition (plinth, wheels and
 * simplified animal forms) - not a reproduction of the State Emblem of India
 * and not a government seal. It sits far behind the content at ~3% opacity
 * purely as decoration.
 */
export function AshokaWatermark() {
  return (
    <div className="watermark" aria-hidden="true">
      <svg viewBox="0 0 400 460" width="100%" height="100%" focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
          {/* abacus / plinth */}
          <rect x="52" y="352" width="296" height="34" rx="8" />
          <rect x="70" y="330" width="260" height="16" rx="6" />

          {/* wheels */}
          <circle cx="104" cy="404" r="20" />
          <circle cx="176" cy="404" r="20" />
          <circle cx="248" cy="404" r="20" />
          <circle cx="320" cy="404" r="20" />

          {/* three abstract animal forms (simplified silhouettes) */}
          <path d="M120 330c-6-30 4-52 26-64 4 20 14 30 30 34-6 6-10 16-10 30Z" />
          <path d="M186 330c-4-34 8-58 32-70 2 22 12 33 28 38-8 8-12 18-12 32Z" />
          <path d="M252 330c-4-34 8-58 32-70 2 22 12 33 28 38-8 8-12 18-12 32Z" />

          {/* base of the capital */}
          <path d="M110 306h180" />
          <path d="M128 268h144" />

          {/* dharma chakra, abstracted */}
          <circle cx="200" cy="196" r="62" />
          <circle cx="200" cy="196" r="14" />
          <path d="M200 134v48M200 210v48M138 196h48M214 196h48M157 153l34 34M209 205l34 34M243 153l-34 34M191 205l-34 34" />
        </g>
      </svg>
    </div>
  )
}

export default AshokaWatermark
