"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Squares2X2Icon,
  XMarkIcon,
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
    icon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
      </svg>
    ),
  },
  {
    label: "Payment Link",
    href: "/tools/payment-link",
    color: "#10B981",
    icon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: "Invoice Generator",
    href: "/tools/invoice-generator",
    color: "#3B82F6",
    icon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: "Price Calculator",
    href: "/tools/price-calculator",
    color: "#8B5CF6",
    icon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 1a1 1 0 10-2 0v2a1 1 0 102 0v-2zm-3-1a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: "Project Kickoff",
    href: "/tools/project-kickoff",
    color: "#F59E0B",
    icon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: "Design Library",
    href: "https://www.figma.com/design/QDGh9XLKyvvumKwftUylvi/Ecomlanders-Design-Library?node-id=382-177",
    external: true,
    color: "#EC4899",
    icon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2.121 2.121 0 00-3-3l-4.9 4.9a1 1 0 00-.242.391l-.97 3.237 3.237-.97a1 1 0 00.39-.242zm7.071-7.071a4.121 4.121 0 00-5.828 0L8.414 10H10a1 1 0 011 1v1.586l2.828-2.828a4.121 4.121 0 000-5.828z" clipRule="evenodd" />
      </svg>
    ),
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
        className="fixed top-4 right-14 z-[60] p-2 rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all duration-200 group"
        title="Quick Links"
      >
        {open ? (
          <XMarkIcon className="size-4 text-[#1B1B1B] transition-transform duration-200" />
        ) : (
          <Squares2X2Icon className="size-4 text-[#7A7A7A] group-hover:text-[#1B1B1B] transition-colors" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={panelRef}
          className="fixed top-14 right-14 z-[60] w-[240px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] border border-[#E5E5EA] overflow-hidden"
          style={{
            animation: "quickLinksIn 0.15s ease-out",
          }}
        >
          <style>{`
            @keyframes quickLinksIn {
              from { opacity: 0; transform: translateY(-8px) scale(0.95); }
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
