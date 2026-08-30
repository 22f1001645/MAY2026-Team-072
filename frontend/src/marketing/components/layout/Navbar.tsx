/**
 * Navbar - Dual-Layer Navigation System Orchestrator
 *
 * Award-winning navigation with:
 * - Primary Nav (Dark Glass): Page-level navigation with smart hide
 * - Secondary Nav (Dark Glass): Section-level navigation (always visible)
 * - Mobile Nav: Combined hamburger menu
 *
 * Smart Behaviors:
 * - Hero Protection: Appears after scrolling 80% on pages with heroes
 * - Smart Sticky: Primary nav hides on scroll down, reveals on scroll up
 * - Secondary nav stays visible for quick section navigation
 */

import { useState, useEffect, useRef } from "react";
import { usePathname } from '../../next-compat';
import { motion, AnimatePresence } from "framer-motion";
import PrimaryNav from "./PrimaryNav";
import SecondaryNav from "./SecondaryNav";
import MobileNav from "./MobileNav";
import { hasSecondaryNav } from "./navigation-config";

export default function Navbar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [showPrimaryNav, setShowPrimaryNav] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Scroll tracking refs
  const lastScrollY = useRef(0);
  const scrollThreshold = 100; // Minimum scroll before triggering smart hide

  // Pages with hero sections that need scroll-triggered visibility
  const pagesWithHero = ["/", "/about"];
  const hasHeroSection = pagesWithHero.includes(pathname ?? "/");
  const showSecondary = hasSecondaryNav(pathname ?? "/");

  // Combined scroll handler for visibility + smart sticky
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const isMobile = window.innerWidth < 768; // True mobile
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

      // HERO PROTECTION: Determine if navbar should be visible at all
      if (hasHeroSection) {
        if (isMobile) {
          // CRITICAL: Always show navbar on mobile for accessibility
          setIsVisible(true);
        } else if (isTablet) {
          // Tablet: show after minimal scroll (50px)
          setIsVisible(currentY > 50);
        } else {
          // Desktop: show after 80% of viewport (preserves hero experience)
          setIsVisible(currentY > window.innerHeight * 0.8);
        }
      } else {
        setIsVisible(true);
      }

      // SMART STICKY: Hide primary nav on scroll down, show on scroll up
      if (currentY > lastScrollY.current && currentY > scrollThreshold) {
        // Scrolling DOWN - hide primary nav
        setShowPrimaryNav(false);
      } else if (
        currentY < lastScrollY.current ||
        currentY <= scrollThreshold
      ) {
        // Scrolling UP or near top - show primary nav
        setShowPrimaryNav(true);
      }

      lastScrollY.current = currentY;
    };

    // Initial check
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Listen to resize for orientation changes
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [hasHeroSection]);

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50"
          >
            {/* Primary Navigation (Dark Glass) - Smart Hide */}
            <AnimatePresence>
              {showPrimaryNav && (
                <motion.div
                  className="mx-4 mt-4"
                  initial={{ y: -80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -80, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <PrimaryNav
                    onMobileMenuToggle={() =>
                      setIsMobileMenuOpen(!isMobileMenuOpen)
                    }
                    isMobileMenuOpen={isMobileMenuOpen}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Secondary Navigation (Dark Glass) - Always Visible */}
            {showSecondary && (
              <motion.div
                className="hidden md:block"
                style={{ marginTop: showPrimaryNav ? "12px" : "16px" }}
                layout
                transition={{ duration: 0.3 }}
              >
                <SecondaryNav />
              </motion.div>
            )}
          </motion.header>
        )}
      </AnimatePresence>

      {/* Mobile Navigation Menu */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
