"use client";

import { motion } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/src/tabs";
import OnboardingTab from "./OnboardingTab";
import CompanyTab from "./CompanyTab";
import AlbumsTab from "./AlbumsTab";
import RegulationsTab from "./RegulationsTab";

export default function AcgLifePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Tabs defaultValue="onboarding" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="onboarding" className="px-3 text-xs sm:px-4 sm:text-sm">
            온보딩 가이드
          </TabsTrigger>
          <TabsTrigger value="company" className="px-3 text-xs sm:px-4 sm:text-sm">
            회사 소개
          </TabsTrigger>
          <TabsTrigger value="albums" className="px-3 text-xs sm:px-4 sm:text-sm">
            행사 앨범
          </TabsTrigger>
          <TabsTrigger value="regulations" className="px-3 text-xs sm:px-4 sm:text-sm">
            사규집
          </TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding">
          <OnboardingTab />
        </TabsContent>

        <TabsContent value="company">
          <CompanyTab />
        </TabsContent>

        <TabsContent value="albums">
          <AlbumsTab />
        </TabsContent>

        <TabsContent value="regulations">
          <RegulationsTab />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
