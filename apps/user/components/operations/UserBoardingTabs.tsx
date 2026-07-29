"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/src/tabs";
import { UserOnboardingClient } from "./UserOnboardingClient";
import { UserOffboardingClient } from "./UserOffboardingClient";

export function UserBoardingTabs() {
  const [tab, setTab] = useState("onboarding");

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="mx-auto w-full max-w-7xl"
    >
      <TabsList>
        <TabsTrigger value="onboarding" className="px-4">
          온보딩
        </TabsTrigger>
        <TabsTrigger value="offboarding" className="px-4">
          오프보딩
        </TabsTrigger>
      </TabsList>
      <TabsContent value="onboarding">
        <UserOnboardingClient />
      </TabsContent>
      <TabsContent value="offboarding">
        <UserOffboardingClient />
      </TabsContent>
    </Tabs>
  );
}
