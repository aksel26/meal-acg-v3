"use client";

import { COMPANY_SECTIONS } from "./data";
import { Target, Users, MapPin, Gift } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const SECTION_ICONS: Record<string, LucideIcon> = {
  mission: Target,
  culture: Users,
  office: MapPin,
  benefits: Gift,
};

export default function CompanyTab() {
  return (
    <div className="space-y-4">
      {COMPANY_SECTIONS.map((section) => {
        const Icon = SECTION_ICONS[section.id] || Target;
        return (
          <div key={section.id} className="rounded-xl bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                <Icon size={16} className="text-slate-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                {section.title}
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              {section.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}
