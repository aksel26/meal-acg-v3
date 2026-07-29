"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/src/tabs";
import { AdminOnboardingClient } from "./AdminOnboardingClient";
import { AdminOffboardingClient } from "./AdminOffboardingClient";

export function AdminBoardingTabs({
  canOnboarding,
  canOffboarding,
}: {
  canOnboarding: boolean;
  canOffboarding: boolean;
}) {
  const [tab, setTab] = useState(canOnboarding ? "onboarding" : "offboarding");

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList>
        {canOnboarding && (
          <TabsTrigger value="onboarding" className="px-4">
            온보딩
          </TabsTrigger>
        )}
        {canOffboarding && (
          <TabsTrigger value="offboarding" className="px-4">
            오프보딩
          </TabsTrigger>
        )}
      </TabsList>
      {canOnboarding && (
        <TabsContent value="onboarding">
          <AdminOnboardingClient />
        </TabsContent>
      )}
      {canOffboarding && (
        <TabsContent value="offboarding">
          <AdminOffboardingClient />
        </TabsContent>
      )}
    </Tabs>
  );
}
