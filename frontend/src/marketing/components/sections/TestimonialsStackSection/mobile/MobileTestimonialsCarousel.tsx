import { useState, useEffect, useRef, useCallback } from "react";
import { motion, PanInfo } from "framer-motion";

/**
 * MobileTestimonialsCarousel - Award-Winning Smart Auto-Play System
 *
 * Features:
 * - Stacked cards with depth effect (scale + opacity)
 * - Smart auto-play: starts when in viewport, pauses on interaction
 * - Swipe navigation for engaged users
 * - Smooth 500ms transitions with Apple easing
 * - Dot indicators with accent colors
 */

// Testimonial data (shared with desktop)
const testimonials = [
  {
    name: "Kothai Mitra",
    role: "Head of Student Affairs, IITM BS",
    content:
      "Watching Ekatva evolve from a concept into a massive regional movement has been incredible. It's a testament to the organizational power and unity of our students across India.",
    accent: "#FFCF96", // unity-gold
    label: "VISIONARY SUPPORT",
  },
  {
    name: "Bharathi Ma'am",
    role: "Coordinator, IITM BS Degree",
    content:
      "Ekatva perfectly bridges the gap between virtual learning and physical community. It creates a space where academic excellence meets cultural vibrancy.",
    accent: "#5CE6C9", // ekatva-teal
    label: "ACADEMIC SYNERGY",
  },
  {
    name: "Vishal Bhandari",
    role: "Event Head, Ekatva Hyderabad",
    content:
      "We handled everything from budget deadlocks to on-site cooking for 260+ people. Ekatva taught us that when students lead, challenges become milestones.",
    accent: "#3FD4B6", // accent-turquoise
    label: "STUDENT LEADERSHIP",
  },
  {
    name: "Ekatva Team",
    role: "The Vision 2025",
    content:
      "9 Cities. 1 Mission. Limitless Experiences. Ekatva is a tradition in the making, and we are just getting started. Are you ready?",
    accent: "#F8F8F8", // off-white
    label: "THE MOVEMENT",
  },
];

// Apple-style easing (typed as tuple for Framer Motion)
const APPLE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Auto-play timing
const AUTO_PLAY_INTERVAL = 4000; // 4 seconds per card
const PAUSE_AFTER_INTERACTION = 6000; // Resume after 6s of no interaction

interface TestimonialCardProps {
  testimonial: (typeof testimonials)[0];
  isActive: boolean;
  position: "current" | "next" | "behind" | "hidden";
}

function TestimonialCard({
  testimonial,
  isActive,
  position,
}: TestimonialCardProps) {
  const { name, role, content, accent, label } = testimonial;
  const isLightAccent = accent === "#F8F8F8" || accent === "#FFCF96";

  // Calculate transform based on position in stack
  // Enhanced depth effect for visible stacking
  const getTransform = () => {
    switch (position) {
      case "current":
        return { scale: 1, opacity: 1, y: 0, zIndex: 50 };
      case "next":
        return { scale: 0.92, opacity: 0.75, y: -16, zIndex: 40 }; // Peek from top
      case "behind":
        return { scale: 0.84, opacity: 0.5, y: -32, zIndex: 30 }; // More visible behind
      case "hidden":
      default:
        return { scale: 0.76, opacity: 0, y: -48, zIndex: 20 };
    }
  };

  const transform = getTransform();

  return (
    <motion.div
      className="absolute inset-0"
      initial={false}
      animate={{
        scale: transform.scale,
        opacity: transform.opacity,
        y: transform.y,
        zIndex: transform.zIndex,
      }}
      transition={{
        duration: 0.5,
        ease: APPLE_EASE,
      }}
      style={{ transformOrigin: "center bottom" }}
    >
      <div
        className="w-full h-full rounded-[1.75rem] p-6 flex flex-col justify-between"
        style={{
          background:
            "linear-gradient(145deg, rgb(14 47 54 / 0.95), rgb(5 5 5 / 0.98))",
          border: `1px solid rgb(92 230 201 / ${isActive ? 0.25 : 0.12})`,
          boxShadow: isActive
            ? "0 25px 50px -12px rgb(0 0 0 / 0.6), 0 0 40px -15px rgb(92 230 201 / 0.15)"
            : "0 10px 30px -10px rgb(0 0 0 / 0.4)",
        }}
      >
        {/* Top Row: Label + Quote Icon */}
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <p
              className="text-[10px] font-black tracking-[0.25em] uppercase"
              style={{ color: accent }}
            >
              {label}
            </p>
            <div
              className="w-8 h-[2px] rounded-full"
              style={{ backgroundColor: accent, opacity: 0.4 }}
            />
          </div>
          <div
            className="text-4xl font-serif opacity-20"
            style={{ color: accent }}
          >
            &ldquo;
          </div>
        </div>

        {/* Quote Content */}
        <blockquote className="text-[15px] text-gray-100 font-medium leading-[1.65] tracking-tight italic flex-1 flex items-center">
          <span>&ldquo;{content}&rdquo;</span>
        </blockquote>

        {/* Attribution */}
        <div className="flex items-center gap-4 pt-5 border-t border-white/[0.06]">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg transform -rotate-2"
            style={{
              backgroundColor: accent,
              color: isLightAccent ? "#050505" : "#FFFFFF",
              boxShadow: `0 8px 20px -4px ${accent}40`,
            }}
          >
            {name.charAt(0)}
          </div>
          <div>
            <h4 className="text-white font-bold text-[15px] tracking-tight">
              {name}
            </h4>
            <p className="text-gray-400 text-[11px] font-medium uppercase tracking-wider">
              {role}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface DotIndicatorProps {
  total: number;
  current: number;
  onDotClick: (index: number) => void;
  accents: string[];
}

function DotIndicator({
  total,
  current,
  onDotClick,
  accents,
}: DotIndicatorProps) {
  return (
    <div
      className="flex items-center justify-center gap-2 mt-6"
      role="tablist"
      aria-label="Testimonial navigation"
    >
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          onClick={() => onDotClick(index)}
          role="tab"
          aria-selected={current === index}
          aria-label={`Go to testimonial ${index + 1}`}
          className="relative transition-all duration-300"
          style={{
            width: current === index ? 24 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor:
              current === index ? accents[index] : "rgb(255 255 255 / 0.2)",
            boxShadow:
              current === index ? `0 0 12px ${accents[index]}50` : "none",
          }}
        />
      ))}
    </div>
  );
}

export default function MobileTestimonialsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const totalCards = testimonials.length;
  const accents = testimonials.map((t) => t.accent);

  // Get position for each card relative to active index
  const getCardPosition = (
    cardIndex: number,
  ): "current" | "next" | "behind" | "hidden" => {
    const diff = cardIndex - activeIndex;

    if (diff === 0) return "current";
    if (diff === 1 || (activeIndex === totalCards - 1 && cardIndex === 0))
      return "next";
    if (
      diff === 2 ||
      (activeIndex === totalCards - 2 && cardIndex === 0) ||
      (activeIndex === totalCards - 1 && cardIndex === 1)
    )
      return "behind";
    return "hidden";
  };

  // Navigate to next card
  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalCards);
  }, [totalCards]);

  // Navigate to previous card
  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalCards) % totalCards);
  }, [totalCards]);

  // Start auto-play
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(goToNext, AUTO_PLAY_INTERVAL);
    setIsAutoPlaying(true);
    setIsPaused(false);
  }, [goToNext]);

  // Pause auto-play (temporarily)
  const pauseAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    setIsPaused(true);

    // Resume after delay
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      if (isAutoPlaying) startAutoPlay();
    }, PAUSE_AFTER_INTERACTION);
  }, [isAutoPlaying, startAutoPlay]);

  // Navigate to specific card
  const goToCard = useCallback(
    (index: number) => {
      setActiveIndex(index);
      pauseAutoPlay();
    },
    [pauseAutoPlay],
  );

  // Stop auto-play completely
  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    setIsAutoPlaying(false);
    setIsPaused(false);
  }, []);

  // Handle swipe gesture
  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      goToNext();
      pauseAutoPlay();
    } else if (info.offset.x > threshold) {
      goToPrev();
      pauseAutoPlay();
    }
  };

  // Handle touch start (pause auto-play)
  const handleTouchStart = () => {
    if (isAutoPlaying) pauseAutoPlay();
  };

  // IntersectionObserver for auto-play
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          startAutoPlay();
        } else {
          stopAutoPlay();
        }
      },
      { threshold: [0, 0.5, 1] },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [startAutoPlay, stopAutoPlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full" onTouchStart={handleTouchStart}>
      {/* Section Header */}
      <div className="text-center mb-8 px-4">
        <div className="flex items-center gap-2 justify-center mb-3">
          <span className="w-8 h-[2px] bg-ekatva-teal" />
          <span className="text-ekatva-teal font-bold uppercase tracking-[0.3em] text-[10px]">
            Voices of Ekatva
          </span>
          <span className="w-8 h-[2px] bg-ekatva-teal" />
        </div>
        <h3 className="text-white text-2xl font-black uppercase tracking-tight">
          Unity In <span className="text-unity-gold italic">Action.</span>
        </h3>
      </div>

      {/* Stacked Cards Container */}
      <motion.div
        className="relative mx-4 h-[380px]"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ touchAction: "pan-y pinch-zoom" }}
      >
        {/* Stack of Cards */}
        {testimonials.map((testimonial, index) => (
          <TestimonialCard
            key={index}
            testimonial={testimonial}
            isActive={index === activeIndex}
            position={getCardPosition(index)}
          />
        ))}
      </motion.div>

      {/* Dot Navigation */}
      <DotIndicator
        total={totalCards}
        current={activeIndex}
        onDotClick={goToCard}
        accents={accents}
      />

      {/* Progress Indicator (shows auto-play status) */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <span className="text-[10px] text-white/40 tracking-wider uppercase">
          {activeIndex + 1} / {totalCards}
        </span>
        {isAutoPlaying && !isPaused && (
          <motion.div
            className="w-2 h-2 rounded-full bg-ekatva-teal"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}
