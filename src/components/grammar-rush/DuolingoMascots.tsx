import React from 'react';

/**
 * Friendly Fox Mascot for Native English Quest
 */
export const FoxMascot: React.FC<{
  className?: string;
  mood?: 'happy' | 'cheering' | 'coaching' | 'curious';
}> = ({ className = 'w-24 h-24', mood = 'happy' }) => {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Soft Ground Shadow */}
      <ellipse cx="60" cy="112" rx="34" ry="5.5" fill="rgba(0,0,0,0.18)" />

      {/* Bushy Fox Tail with White Tip */}
      <g>
        <path
          d="M86 96C98 94 112 84 114 68C116 54 104 46 96 50C88 54 84 66 84 80L86 96Z"
          fill="#ff7a29"
        />
        {/* Tail 3D Underbelly shading */}
        <path
          d="M86 96C96 95 106 88 108 76C102 78 94 82 86 96Z"
          fill="#e86010"
        />
        {/* White Tail Tip */}
        <path
          d="M104 50C108 48 114 54 114 62C110 64 106 60 102 62C100 58 102 52 104 50Z"
          fill="#ffffff"
        />
      </g>

      {/* Little Paws / Feet */}
      <ellipse cx="44" cy="108" rx="7" ry="4" fill="#2b2f8f" />
      <ellipse cx="76" cy="108" rx="7" ry="4" fill="#2b2f8f" />

      {/* Body (Warm Fox Orange) */}
      <path
        d="M32 58C32 40 44 32 60 32C76 32 88 40 88 58C88 82 82 106 60 106C38 106 32 82 32 58Z"
        fill="#ff7a29"
      />
      {/* 3D Bottom shading */}
      <path
        d="M34 82C40 98 48 106 60 106C72 106 80 98 86 82C84 94 72 102 60 102C48 102 36 94 34 82Z"
        fill="#e86010"
      />

      {/* White Chest / Bib Fur */}
      <path
        d="M48 68C48 68 54 78 60 78C66 78 72 68 72 68C72 82 68 98 60 98C52 98 48 82 48 68Z"
        fill="#ffffff"
      />

      {/* Fox Ears (Pointy & Alert!) */}
      {/* Left Ear */}
      <path
        d="M34 40L24 12L50 26L34 40Z"
        fill="#ff7a29"
        stroke="#e86010"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Left Ear Dark/Navy Tip */}
      <path d="M24 12L31 20L28 23L24 12Z" fill="#2b2f8f" />
      {/* Left Ear Inner White Fur */}
      <path d="M32 34L28 20L44 28L32 34Z" fill="#ffffff" />

      {/* Right Ear */}
      <path
        d="M86 40L96 12L70 26L86 40Z"
        fill="#ff7a29"
        stroke="#e86010"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Right Ear Dark/Navy Tip */}
      <path d="M96 12L89 20L92 23L96 12Z" fill="#2b2f8f" />
      {/* Right Ear Inner White Fur */}
      <path d="M88 34L92 20L76 28L88 34Z" fill="#ffffff" />

      {/* Head (Fluffy Oval) */}
      <ellipse cx="60" cy="52" rx="28" ry="24" fill="#ff7a29" />

      {/* White Cheeks (Fox Muzzle Flares) */}
      <path
        d="M34 56C32 64 36 72 46 72C54 72 58 64 60 62C62 64 66 72 74 72C84 72 88 64 86 56C82 50 78 46 70 48C64 50 62 56 60 56C58 56 56 50 50 48C42 46 38 50 34 56Z"
        fill="#ffffff"
      />

      {/* Cheering Paws (If mood === 'cheering') */}
      {mood === 'cheering' ? (
        <>
          <ellipse cx="28" cy="46" rx="6" ry="9" transform="rotate(-28 28 46)" fill="#ff7a29" stroke="#e86010" strokeWidth="1.5" />
          <ellipse cx="92" cy="46" rx="6" ry="9" transform="rotate(28 92 46)" fill="#ff7a29" stroke="#e86010" strokeWidth="1.5" />
          <circle cx="26" cy="40" r="3.5" fill="#ffffff" />
          <circle cx="94" cy="40" r="3.5" fill="#ffffff" />
        </>
      ) : (
        <>
          {/* Relaxed Little Paws */}
          <ellipse cx="44" cy="80" rx="5" ry="6" fill="#ff7a29" stroke="#e86010" strokeWidth="1.5" />
          <ellipse cx="76" cy="80" rx="5" ry="6" fill="#ff7a29" stroke="#e86010" strokeWidth="1.5" />
          <circle cx="44" cy="83" r="2.5" fill="#ffffff" />
          <circle cx="76" cy="83" r="2.5" fill="#ffffff" />
        </>
      )}

      {/* Coaching Glasses (If mood === 'coaching') */}
      {mood === 'coaching' && (
        <g stroke="#2b2f8f" strokeWidth="2.5" fill="none">
          <circle cx="48" cy="50" r="8" fill="rgba(79,195,232,0.2)" />
          <circle cx="72" cy="50" r="8" fill="rgba(79,195,232,0.2)" />
          <path d="M56 50H64" />
          <path d="M40 48L34 46" />
          <path d="M80 48L86 46" />
        </g>
      )}

      {/* Fox Eyes (Friendly Sparkle) */}
      <circle cx="48" cy="49" r="4.5" fill="#1c2038" />
      <circle cx="72" cy="49" r="4.5" fill="#1c2038" />
      {/* Eye catchlights */}
      <circle cx="46.5" cy="47.5" r="1.8" fill="#ffffff" />
      <circle cx="70.5" cy="47.5" r="1.8" fill="#ffffff" />
      <circle cx="49.5" cy="50.5" r="0.8" fill="#ffffff" />
      <circle cx="73.5" cy="50.5" r="0.8" fill="#ffffff" />

      {/* Cute Black Button Nose */}
      <path
        d="M57 60C57 59 63 59 63 60C63 62 61 63.5 60 63.5C59 63.5 57 62 57 60Z"
        fill="#1c2038"
      />

      {/* Happy Fox Smile */}
      <path
        d="M56 63.5C57.5 65.5 59 65.5 60 64.5C61 65.5 62.5 65.5 64 63.5"
        stroke="#1c2038"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Cute Whiskers */}
      <path d="M38 60L28 58" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M38 64L30 65" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M82 60L92 58" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M82 64L90 65" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

// Backwards-compatible alias so existing imports work seamlessly
export const DuoOwl = FoxMascot;

/**
 * Duolingo Mustache Teacher at Chalkboard (Matches image 2!)
 */
export const DuolingoTeacher: React.FC<{ className?: string }> = ({
  className = 'w-36 h-36',
}) => {
  return (
    <svg
      viewBox="0 0 160 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Chalkboard behind */}
      <rect x="10" y="24" width="76" height="66" rx="8" fill="#2b3840" stroke="#4b5d67" strokeWidth="4" />
      {/* Chalk Diagram lines */}
      <path d="M22 42C30 36 44 48 58 40" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeDasharray="3 3" />
      <circle cx="58" cy="40" r="3" fill="#1cb0f6" />
      <circle cx="22" cy="42" r="3" fill="#ffc800" />
      <path d="M24 64H50" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      <path d="M24 72H64" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />

      {/* Teacher Ground Shadow */}
      <ellipse cx="114" cy="132" rx="26" ry="5" fill="rgba(0,0,0,0.2)" />

      {/* Teacher Body */}
      {/* Green Pants */}
      <rect x="102" y="104" width="12" height="24" rx="4" fill="#00cd9c" />
      <rect x="116" y="104" width="12" height="24" rx="4" fill="#00cd9c" />
      {/* Shoes */}
      <ellipse cx="106" cy="128" rx="7" ry="4" fill="#1cb0f6" />
      <ellipse cx="124" cy="128" rx="7" ry="4" fill="#1cb0f6" />

      {/* Pink Shirt */}
      <path d="M96 74C96 66 102 60 114 60C126 60 132 66 132 74L136 106C136 108 134 110 132 110H96C94 110 92 108 92 106L96 74Z" fill="#ff86d0" />
      {/* Belt */}
      <rect x="94" y="104" width="40" height="4" fill="#1b262b" />

      {/* Pointing Arm pointing at board */}
      <path
        d="M98 76L68 54"
        stroke="#fbc3a1"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="66" cy="52" r="5" fill="#fbc3a1" />

      {/* Head */}
      <ellipse cx="116" cy="46" rx="16" ry="17" fill="#fbc3a1" />

      {/* Hair (Black puffy hair) */}
      <path
        d="M98 44C98 32 106 24 118 24C128 24 136 30 136 40C138 42 138 48 134 50C132 44 130 38 126 36C122 34 110 34 104 38C100 40 98 44 98 44Z"
        fill="#2b1f1d"
      />

      {/* Big Mustache */}
      <path
        d="M102 54C106 50 114 54 116 54C118 54 126 50 130 54C132 57 128 62 120 60C117 59 115 57 114 57C113 57 111 59 108 60C100 62 98 57 102 54Z"
        fill="#2b1f1d"
      />

      {/* Nose */}
      <ellipse cx="115" cy="49" rx="3.5" ry="3" fill="#e59877" />

      {/* Eyes */}
      <circle cx="108" cy="44" r="2.5" fill="#2b1f1d" />
      <circle cx="122" cy="44" r="2.5" fill="#2b1f1d" />
    </svg>
  );
};

/**
 * Witch Avatar (Matches image 1 top left pill!)
 */
export const DuolingoWitch: React.FC<{ className?: string }> = ({
  className = 'w-10 h-10',
}) => {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="32" cy="32" r="28" fill="#2B2F8F" />
      <ellipse cx="32" cy="38" rx="14" ry="15" fill="#fbc3a1" />
      <path d="M20 36C20 44 24 50 32 50C40 50 44 44 44 36" fill="#4FC3E8" />
      <circle cx="27" cy="38" r="2.5" fill="#2b1f1d" />
      <circle cx="37" cy="38" r="2.5" fill="#2b1f1d" />
      <path d="M29 44C31 46 33 46 35 44" stroke="#4FC3E8" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="32" cy="28" rx="24" ry="7" fill="#1C2068" />
      <path d="M16 28L32 6L48 28H16Z" fill="#2B2F8F" />
      <rect x="22" y="24" width="20" height="5" fill="#4FC3E8" />
      <circle cx="32" cy="26" r="3.5" fill="#ffffff" />
      <circle cx="31" cy="25.5" r="0.8" fill="#1e1b4b" />
      <circle cx="33" cy="25.5" r="0.8" fill="#1e1b4b" />
    </svg>
  );
};

/**
 * 3D Milestone Treasure Chest
 */
export const DuolingoChest: React.FC<{
  isOpen?: boolean;
  onClick?: () => void;
  className?: string;
}> = ({ isOpen = false, onClick, className = 'w-16 h-16' }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative cursor-pointer transition-transform hover:scale-110 active:scale-95 group focus:outline-none ${className}`}
      title="Bonus Milestone Chest"
    >
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        <ellipse cx="40" cy="72" rx="26" ry="6" fill="rgba(0,0,0,0.22)" />
        <rect x="14" y="34" width="52" height="34" rx="8" fill="#ffc800" stroke="#e5a500" strokeWidth="3" />
        <path d="M14 56C14 62 18 68 24 68H56C62 68 66 62 66 56H14Z" fill="#d97706" />
        <rect x="24" y="34" width="6" height="34" fill="#78350f" />
        <rect x="50" y="34" width="6" height="34" fill="#78350f" />
        {isOpen ? (
          <path
            d="M10 24C10 16 22 8 40 8C58 8 70 16 70 24L66 32H14L10 24Z"
            fill="#fbbf24"
            stroke="#d97706"
            strokeWidth="3"
          />
        ) : (
          <path
            d="M12 36C12 24 22 18 40 18C58 18 68 24 68 36H12Z"
            fill="#ffc800"
            stroke="#e5a500"
            strokeWidth="3"
          />
        )}
        <circle cx="40" cy="42" r="7" fill="#ffffff" stroke="#b45309" strokeWidth="2.5" />
        <circle cx="40" cy="42" r="3" fill="#b45309" />
        <rect x="38.5" y="42" width="3" height="5" fill="#b45309" />
      </svg>
      {!isOpen && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[9px] text-white font-black items-center justify-center">
            ★
          </span>
        </span>
      )}
    </button>
  );
};
