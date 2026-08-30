/**
 * MobileNav - Combined Hamburger Menu
 *
 * UX Best Practice (Perplexity-validated):
 * - Single hamburger for both primary & secondary nav
 * - Accordion-style expansion for pages with sections
 * - Full-screen overlay for immersive experience
 * - Large touch targets (44px minimum)
 * - Smooth animations
 */

import { useState } from "react";
import { usePathname } from '../../next-compat';
import { Link } from '../../next-compat';
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import {
  PRIMARY_NAV,
  SECONDARY_NAV,
  EDITIONS_NAV,
  isNavActive,
  hasSecondaryNav,
  APP_ROUTES,
} from "./navigation-config";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [editionsExpanded, setEditionsExpanded] = useState(false);

  // Handle section link click
  const handleSectionClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    target: string,
  ) => {
    e.preventDefault();
    onClose();

    // Small delay to allow menu to close before scrolling
    setTimeout(() => {
      const targetId = target.replace("#", "");
      const element = document.getElementById(targetId);

      if (element) {
        const navHeight = 80;
        const elementPosition =
          element.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - navHeight;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    }, 300);
  };

  // Animation variants
  const menuVariants = {
    closed: { opacity: 0, x: "100%" },
    open: { opacity: 1, x: 0 },
  };

  const itemVariants = {
    closed: { opacity: 0, x: 20 },
    open: { opacity: 1, x: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-oneness-black/80 backdrop-blur-sm z-[90]"
            onClick={onClose}
          />

          {/* Menu Panel */}
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-oneness-black border-l border-white/10 z-[100] overflow-y-auto"
            style={{
              background:
                "linear-gradient(180deg, rgba(5,5,5,1) 0%, rgba(10,10,10,1) 100%)",
            }}
          >
            {/* Menu Header */}
            <div className="sticky top-0 bg-oneness-black/90 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <span className="font-serif text-xl text-white">Menu</span>
              <button
                onClick={onClose}
                className="p-2 -m-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5 active:bg-white/10"
                aria-label="Close menu"
              >
                <X size={24} strokeWidth={2} />
              </button>
            </div>

            {/* Navigation Items */}
            <div className="p-6 space-y-2">
              {PRIMARY_NAV.map((item, index) => {
                const isActive = isNavActive(item.href, pathname ?? "/");
                const hasSections = hasSecondaryNav(item.href);
                const isExpanded =
                  expandedPage === item.href || (isActive && hasSections);
                const sections = SECONDARY_NAV[item.href] || [];

                // Editions Dropdown
                if (item.type === "dropdown") {
                  return (
                    <motion.div
                      key={item.href}
                      variants={itemVariants}
                      transition={{ delay: index * 0.05 }}
                    >
                      <button
                        onClick={() => setEditionsExpanded(!editionsExpanded)}
                        className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-colors ${
                          isActive
                            ? "bg-ekatva-teal/10 text-ekatva-teal"
                            : "text-white/80 hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-lg">{item.icon}</span>
                          <span className="font-medium">{item.label}</span>
                        </span>
                        <ChevronDown
                          size={18}
                          className={`transition-transform ${editionsExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      <AnimatePresence>
                        {editionsExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-8 py-2 space-y-1">
                              {EDITIONS_NAV.map((edition) => (
                                <Link
                                  key={edition.slug}
                                  href={`/editions/${edition.slug}`}
                                  onClick={onClose}
                                  className="flex items-center justify-between px-4 py-3 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                  <span>{edition.name}</span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      edition.status === "completed"
                                        ? "bg-ekatva-teal/20 text-ekatva-teal"
                                        : "bg-white/10 text-white/40"
                                    }`}
                                  >
                                    {edition.status === "completed"
                                      ? "✓"
                                      : edition.date}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                }

                // Regular Page Links (with optional section accordion)
                return (
                  <motion.div
                    key={item.href}
                    variants={itemVariants}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center">
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (!hasSections || pathname !== item.href) {
                            onClose();
                          }
                        }}
                        className={`flex-1 flex items-center gap-3 px-4 py-4 rounded-xl transition-colors ${
                          isActive
                            ? "bg-ekatva-teal/10 text-ekatva-teal"
                            : "text-white/80 hover:bg-white/5"
                        }`}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                      </Link>

                      {/* Expand button for pages with sections */}
                      {hasSections && (
                        <button
                          onClick={() =>
                            setExpandedPage(isExpanded ? null : item.href)
                          }
                          className="p-4 text-white/40 hover:text-white transition-colors"
                          aria-label="Show sections"
                        >
                          <ChevronDown
                            size={18}
                            className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Section Links (Accordion) */}
                    <AnimatePresence>
                      {hasSections && isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-8 py-2 space-y-1">
                            {sections.map((section) => (
                              <a
                                key={section.target}
                                href={section.target}
                                onClick={(e) =>
                                  handleSectionClick(e, section.target)
                                }
                                className="flex items-center gap-2 px-4 py-3 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                              >
                                <ChevronRight
                                  size={14}
                                  className="text-ekatva-teal/50"
                                />
                                <span className="text-sm">{section.label}</span>
                              </a>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA Buttons - hand off to Ekatva OS */}
            <div className="flex flex-col gap-3 p-6 pt-0">
              <Link
                href={APP_ROUTES.signUp}
                onClick={onClose}
                className="block w-full px-6 py-4 bg-ekatva-teal rounded-xl text-oneness-black font-bold text-center uppercase tracking-wider hover:shadow-[0_0_30px_rgba(92,230,201,0.4)] transition-all"
              >
                Get Started
              </Link>
              <Link
                href={APP_ROUTES.logIn}
                onClick={onClose}
                className="block w-full px-6 py-3.5 rounded-xl border border-ekatva-teal/30 text-ekatva-teal font-semibold text-center uppercase tracking-wider transition-colors hover:bg-ekatva-teal/10"
              >
                Log in
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
