import { forwardRef } from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import PlanetGlyph from "./PlanetGlyph";

/**
 * PillarCard — Award-Winning Mobile Pillar Card (v2.0)
 *
 * REVAMP FEATURES:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 1. COMPACT LAYOUT: Fits single viewport (508px total)
 * 2. REORDERED: Pills BEFORE description (elevated visibility)
 * 3. INLINE HEADER: 48px icon + label in horizontal layout
 * 4. ENHANCED PILLS: Shadow, stronger border, 60ms stagger
 * 5. DESCRIPTION BELOW: Secondary info, reduced opacity
 *
 * DESIGN PHILOSOPHY:
 * - Single viewport → No scroll fatigue
 * - Pills first → Immediate value prop discovery
 * - Compact icon → Modern, intentional layout
 * - Subtle polish → Premium, not flashy
 */

const APPLE_EASE = [0.16, 1, 0.3, 1] as const;

interface PillarCardProps {
  planet: {
    id: string;
    name: string;
    appearance: {
      baseColor: string;
      glowColor: string;
      icon: LucideIcon;
    };
    content: {
      headline: string;
      description: string;
      activities: string[];
    };
  };
  isActive?: boolean;
}

const PillarCard = forwardRef<HTMLDivElement, PillarCardProps>(
  ({ planet, isActive = false }, ref) => {
    return (
      <div
        ref={ref}
        className="scroll-snap-center flex-shrink-0 w-[calc(100vw-48px)] max-w-[360px]"
      >
        <motion.div
          className="relative rounded-3xl px-5 py-6 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, transparent 100%)`,
            border: isActive
              ? `1px solid ${planet.appearance.baseColor}30`
              : "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: isActive
              ? `0 0 40px ${planet.appearance.glowColor}`
              : "none",
          }}
          initial={{ opacity: 0.8 }}
          animate={{
            opacity: isActive ? 1 : 0.6,
            scale: isActive ? 1 : 0.95,
          }}
          transition={{ duration: 0.4, ease: APPLE_EASE }}
        >
          {/* Radial Glow Background */}
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[200px] -z-10 blur-[60px]"
            style={{
              background: `radial-gradient(circle, ${planet.appearance.glowColor} 0%, transparent 70%)`,
            }}
            animate={{ opacity: isActive ? 0.5 : 0.2 }}
            transition={{ duration: 0.5 }}
          />

          {/* ═══════════════════════════════════════════════════════ */}
          {/* COMPACT HEADER: 48px Icon + Category Label (INLINE)     */}
          {/* ═══════════════════════════════════════════════════════ */}
          <motion.div
            className="flex items-center gap-3 mb-4"
            initial={{ opacity: 0, x: -10 }}
            animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0.5, x: -5 }}
            transition={{ duration: 0.4, ease: APPLE_EASE }}
          >
            {/* Compact Icon with Breathing Animation */}
            <motion.div
              animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <PlanetGlyph
                icon={planet.appearance.icon}
                baseColor={planet.appearance.baseColor}
                glowColor={planet.appearance.glowColor}
                size={48}
              />
            </motion.div>

            {/* Category Label */}
            <span
              className="text-xs uppercase tracking-[0.15em] font-semibold"
              style={{ color: planet.appearance.baseColor }}
            >
              {planet.name}
            </span>
          </motion.div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* HEADLINE: Larger (24px), High Impact                    */}
          {/* ═══════════════════════════════════════════════════════ */}
          <motion.h3
            className="font-serif text-2xl text-left mb-4 text-white leading-tight tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.5, y: 5 }}
            transition={{ duration: 0.4, delay: 0.1, ease: APPLE_EASE }}
          >
            {planet.content.headline}
          </motion.h3>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* ACTIVITIES SECTION: ELEVATED (Before Description)       */}
          {/* ═══════════════════════════════════════════════════════ */}
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.3, y: 5 }}
            transition={{ duration: 0.4, delay: 0.2, ease: APPLE_EASE }}
          >
            {/* Featured Activities Label */}
            <h4 className="text-[10px] uppercase tracking-[0.12em] text-white/40 mb-2.5 font-semibold">
              Featured Activities
            </h4>

            {/* Activity Pills — Compact + Polished */}
            <div className="flex flex-wrap gap-2">
              {planet.content.activities.map((activity, i) => (
                <motion.span
                  key={activity}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: `${planet.appearance.baseColor}50`, // 50% opacity (was 40%)
                    color: planet.appearance.baseColor,
                    backgroundColor: `${planet.appearance.baseColor}12`,
                    boxShadow: isActive
                      ? `0 2px 8px ${planet.appearance.baseColor}15`
                      : "none",
                  }}
                  initial={{ opacity: 0, scale: 0.85, y: 8 }}
                  animate={
                    isActive
                      ? {
                          opacity: 1,
                          scale: 1,
                          y: 0,
                        }
                      : {
                          opacity: 0.4,
                          scale: 0.95,
                          y: 0,
                        }
                  }
                  transition={{
                    duration: 0.3,
                    delay: 0.25 + i * 0.06, // 60ms stagger
                    ease: APPLE_EASE,
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {activity}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* DESCRIPTION: Secondary Info (Below Pills, Reduced)      */}
          {/* ═══════════════════════════════════════════════════════ */}
          <motion.p
            className="text-sm text-left text-white/55 leading-relaxed line-clamp-2"
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
            initial={{ opacity: 0, y: 8 }}
            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.25, y: 4 }}
            transition={{ duration: 0.4, delay: 0.35, ease: APPLE_EASE }}
          >
            {planet.content.description}
          </motion.p>
        </motion.div>
      </div>
    );
  },
);

PillarCard.displayName = "PillarCard";

export default PillarCard;
