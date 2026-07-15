"use client";

import { ONBOARDING_STEPS } from "./data";
import { CheckCircle2 } from "lucide-react";

export default function OnboardingTab() {
  return (
    <div className="space-y-4">
      {ONBOARDING_STEPS.map((step, index) => (
        <div key={step.id} className="rounded-xl bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
              {index + 1}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                {step.title}
              </h3>
              <p className="text-xs text-slate-500">{step.description}</p>
            </div>
          </div>
          <ul className="space-y-2 pl-10">
            {step.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2
                  size={15}
                  className="mt-0.5 shrink-0 text-slate-300"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
