"use client";

/**
 * Renders the two-layer milestone flame as an inline vector so it remains
 * crisp at every display density and can inherit a transparent background.
 * The path morphs deliberately stay subtle: the flame should feel alive
 * without becoming distracting during the larger waypoint celebration.
 */
export function AnimatedFlame({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}): React.ReactNode {
  const outerPath =
    "M166 14C228 18 277 74 276 132C275 163 261 184 270 198C281 214 301 204 311 183C339 204 353 246 347 290C338 353 285 387 211 388C125 389 67 348 57 281C49 226 72 175 108 128C116 117 121 120 118 144C114 176 115 193 125 209C131 171 143 136 166 109C188 84 190 56 166 14Z";
  const innerPath =
    "M225 146C218 178 219 199 236 224C259 256 278 279 275 316C270 362 237 386 197 386C155 386 128 362 128 326C128 301 136 278 145 263C151 288 163 299 173 291C183 283 164 264 169 236C174 205 194 175 225 146Z";

  return (
    <svg
      viewBox="0 0 400 400"
      className="size-full overflow-visible"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="waypoint-flame-outer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff3632" />
          <stop offset="48%" stopColor="#ff7200" />
          <stop offset="100%" stopColor="#ff9d00" />
        </linearGradient>
        <linearGradient id="waypoint-flame-inner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff176" />
          <stop offset="72%" stopColor="#fff6b0" />
          <stop offset="100%" stopColor="#fffdf2" />
        </linearGradient>
        <filter id="waypoint-flame-glow" x="-30%" y="-30%" width="160%" height="170%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0.35 0 0.45 0 0 0.08 0 0 0.1 0 0 0 0 0 0.32 0"
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#waypoint-flame-glow)">
        {!reducedMotion && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-1.4 205 250;1.2 205 250;-1.4 205 250"
            dur="1.05s"
            repeatCount="indefinite"
          />
        )}
        <path d={outerPath} fill="url(#waypoint-flame-outer)">
          {!reducedMotion && (
            <animate
              attributeName="d"
              values={`${outerPath};M170 15C232 22 270 76 270 132C269 164 258 184 270 198C282 212 301 203 313 180C342 208 353 249 345 292C334 352 281 387 210 388C127 389 69 347 58 281C49 229 71 176 107 129C115 118 121 119 118 145C114 178 116 194 127 210C133 172 145 137 169 108C191 81 192 53 170 15Z;M163 13C225 17 281 73 278 133C276 164 262 183 270 199C279 216 301 205 310 186C337 203 354 245 349 289C341 353 288 387 212 388C124 389 65 349 56 281C48 223 73 173 109 127C117 116 122 121 119 143C114 175 114 191 123 207C129 169 141 134 164 110C185 87 187 59 163 13Z;${outerPath}`}
              dur="0.82s"
              repeatCount="indefinite"
            />
          )}
        </path>
        <path d={innerPath} fill="url(#waypoint-flame-inner)">
          {!reducedMotion && (
            <animate
              attributeName="d"
              values={`${innerPath};M229 145C218 178 221 201 239 226C261 257 279 281 274 318C268 362 237 386 197 386C154 386 128 361 129 325C129 301 136 280 146 261C153 287 164 297 174 289C184 280 165 262 170 234C176 202 197 172 229 145Z;M221 147C216 179 218 198 233 222C256 254 277 277 276 315C273 361 238 386 198 386C156 386 128 363 128 327C128 302 135 277 144 265C149 290 162 301 172 293C181 286 163 266 168 238C172 207 192 178 221 147Z;${innerPath}`}
              dur="1.24s"
              repeatCount="indefinite"
            />
          )}
        </path>
      </g>

      {!reducedMotion && (
        <g fill="#ff8a00">
          <circle r="8">
            <animate attributeName="cx" values="174;158;151" dur="1.35s" repeatCount="indefinite" />
            <animate attributeName="cy" values="118;74;38" dur="1.35s" repeatCount="indefinite" />
            <animate attributeName="r" values="2;8;1" dur="1.35s" repeatCount="indefinite" />
            <animate
              attributeName="opacity"
              values="0;0;1;0"
              keyTimes="0;0.18;0.48;1"
              dur="1.35s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="5">
            <animate
              attributeName="cx"
              values="274;289;282"
              begin="0.48s"
              dur="1.55s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values="186;137;101"
              begin="0.48s"
              dur="1.55s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values="1;5;1"
              begin="0.48s"
              dur="1.55s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0;0.9;0"
              keyTimes="0;0.2;0.5;1"
              begin="0.48s"
              dur="1.55s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      )}
    </svg>
  );
}
