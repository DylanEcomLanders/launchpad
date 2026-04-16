"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Squares2X2Icon,
  XMarkIcon,
  EnvelopeIcon,
  CreditCardIcon,
  DocumentTextIcon,
  CalculatorIcon,
  RocketLaunchIcon,
  SwatchIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

interface QuickLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  external?: boolean;
  color: string;
}

const links: QuickLink[] = [
  {
    label: "Onboarding Form",
    href: "/onboard",
    external: true,
    color: "#1B1B1B",
    icon: <EnvelopeIcon className="size-4" />,
  },
  {
    label: "Payment Link",
    href: "/tools/payment-link",
    color: "#10B981",
    icon: <CreditCardIcon className="size-4" />,
  },
  {
    label: "Invoice Generator",
    href: "/tools/invoice-generator",
    color: "#3B82F6",
    icon: <DocumentTextIcon className="size-4" />,
  },
  {
    label: "Price Calculator",
    href: "/tools/price-calculator",
    color: "#8B5CF6",
    icon: <CalculatorIcon className="size-4" />,
  },
  {
    label: "Project Kickoff",
    href: "/tools/project-kickoff",
    color: "#F59E0B",
    icon: <RocketLaunchIcon className="size-4" />,
  },
  {
    label: "Design Library",
    href: "https://www.figma.com/design/QDGh9XLKyvvumKwftUylvi/Ecomlanders-Design-Library?node-id=382-177",
    external: true,
    color: "#EC4899",
    icon: <SwatchIcon className="size-4" />,
  },
  {
    label: "Report Issue",
    href: "/tools/issues",
    color: "#EF4444",
    icon: <ExclamationCircleIcon className="size-4" />,
  },
];

export function QuickLinks() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1B1B1B] shadow-[0_4px_20px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.15)] hover:bg-[#2D2D2D] hover:shadow-[0_6px_28px_rgba(0,0,0,0.3)] transition-all duration-200 group"
        title="Quick Links"
      >
        {open ? (
          <XMarkIcon className="size-4 text-white" />
        ) : (
          <>
            <Squares2X2Icon className="size-4 text-white/70 group-hover:text-white transition-colors" />
            <span className="text-[11px] font-medium text-white/70 group-hover:text-white transition-colors hidden sm:inline">Quick Links</span>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-16 right-5 z-[60] w-[240px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] border border-[#E5E5EA] overflow-hidden"
          style={{
            animation: "quickLinksIn 0.15s ease-out",
          }}
        >
          <style>{`
            @keyframes quickLinksIn {
              from { opacity: 0; transform: translateY(8px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <div className="px-3 py-2.5 border-b border-[#F0F0F0]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#BBB]">Quick Links</p>
          </div>
          <div className="py-1.5">
            {links.map((link) => {
              const content = (
                <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#FAFAFA] transition-colors cursor-pointer group/item">
                  <div
                    className="size-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-150 group-hover/item:scale-110"
                    style={{ backgroundColor: link.color + "12", color: link.color }}
                  >
                    {link.icon}
                  </div>
                  <span className="text-sm text-[#555] group-hover/item:text-[#1B1B1B] transition-colors">{link.label}</span>
                  {link.external && (
                    <svg className="size-3 text-[#DDD] ml-auto shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5zm7.25-.75a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V6.31l-5.47 5.47a.75.75 0 01-1.06-1.06l5.47-5.47H12.25a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              );

              if (link.external) {
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <Link key={link.label} href={link.href} onClick={() => setOpen(false)}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
