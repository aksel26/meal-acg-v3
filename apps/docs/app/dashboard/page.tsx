"use client";

export const dynamic = "force-dynamic";

import { Alert, AlertTitle } from "@repo/ui/src/alert";
import { Button } from "@repo/ui/src/button";
import Calendar21 from "@repo/ui/src/calendar-21";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/src/card";
import { ChartPieDonut } from "@repo/ui/src/chart-pie-donut";
import { useRouter } from "next/navigation";
import { Suspense, lazy, useEffect, useState } from "react";
import { MealCards } from "../../components/MealCards";
import { useCalculationData } from "../../hooks/use-calculation-data";
import { useMealData } from "../../hooks/use-meal-data";
import { useFileValidation } from "../../hooks/use-file-validation";
import { useMealSubmit } from "../../hooks/use-meal-submit";
import { useMealDelete } from "../../hooks/use-meal-delete";

// Lazy load the MealEntryDrawer component
const MealEntryDrawer = lazy(() => import("../../components/MealEntryDrawer"));

interface CalculationData {
  fileName: string;
  month: number;
  workDays: number;
  holidayWorkDays: number;
  vacationDays: number;
  availableAmount: number;
  totalUsed: number;
  balance: number;
}

function CalculationResult({ userName, month, year, onDataChange }: { 
  userName: string; 
  month: number;
  year: number;
  onDataChange?: (data: CalculationData | null) => void 
}) {
  const { data, isLoading, error, refetch } = useCalculationData(userName, month, year);

  // 데이터 변경 시 부모 컴포넌트에 전달
  useEffect(() => {
    onDataChange?.(data || null);
  }, [data, onDataChange]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">계산 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error.message}</p>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          다시 시도
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-xl font-bold text-blue-600">{data.workDays}</div>
          <div className="text-sm text-blue-700">근무일</div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-xl font-bold text-orange-600">{data.holidayWorkDays}</div>
          <div className="text-sm text-orange-700">휴일근무</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-xl font-bold text-red-600">{data.vacationDays}</div>
          <div className="text-sm text-red-700">휴가일</div>
        </div>
      </div>
    </div>
  );
}

interface MealData {
  date: string;
  attendance: string;
  lunch?: {
    store: string;
    amount: number;
    payer: string;
  };
  dinner?: {
    store: string;
    amount: number;
    payer: string;
  };
  breakfast?: {
    store: string;
    amount: number;
    payer: string;
  };
}

export default function DashboardPage() {
  const [userName, setUserName] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [selectedMealType, setSelectedMealType] = useState<"breakfast" | "lunch" | "dinner">("lunch");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [calculationData, setCalculationData] = useState<CalculationData | null>(null);
  const [formData, setFormData] = useState({
    payer: "",
    store: "",
    amount: "",
    attendance: "",
  });
  const router = useRouter();

  // TanStack Query hooks 사용
  const { data: mealData = [] } = useMealData(userName, currentMonth, currentYear);
  const { 
    data: fileValidationData, 
    isLoading: fileValidationLoading, 
    error: fileValidationError 
  } = useFileValidation(userName, currentMonth, currentYear);
  const mealSubmitMutation = useMealSubmit();
  const mealDeleteMutation = useMealDelete();

  // 파일 검증 상태를 계산하는 함수
  const getFileValidationStatus = () => {
    if (fileValidationLoading) return "checking";
    if (fileValidationError) return "invalid";
    if (fileValidationData) return "valid";
    return null;
  };

  const getFileValidationMessage = () => {
    if (fileValidationLoading) return "📁 파일 확인 중...";
    if (fileValidationError) return `⚠️ ${fileValidationError.message}`;
    if (fileValidationData) return `✅ ${fileValidationData.semesterInfo.folderName}에서 ${fileValidationData.totalFiles}개 파일 발견`;
    return "";
  };

  useEffect(() => {
    const name = localStorage.getItem("name");
    if (!name) {
      router.push("/");
      return;
    }
    setUserName(name);
  }, [router]);

  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const handleLogout = () => {
    localStorage.removeItem("name");
    router.push("/");
  };

  const handleAddMeal = (mealType: "breakfast" | "lunch" | "dinner") => {
    setSelectedMealType(mealType);
    setIsEditMode(false);
    setFormData({ payer: "", store: "", amount: "", attendance: "" });
    setIsDrawerOpen(true);
  };

  const handleEditMeal = (mealType: "breakfast" | "lunch" | "dinner", mealInfo: MealData) => {
    setSelectedMealType(mealType);
    setIsEditMode(true);

    const mealTypeData = mealInfo[mealType];
    setFormData({
      payer: mealTypeData?.payer || "",
      store: mealTypeData?.store || "",
      amount: mealTypeData?.amount?.toString() || "",
      attendance: mealInfo.attendance || "",
    });

    setIsDrawerOpen(true);
  };

  const handleHolidayAttendanceEdit = (mealInfo: MealData) => {
    setSelectedMealType("lunch");
    setIsEditMode(true);

    setFormData({
      payer: "",
      store: "",
      amount: "",
      attendance: mealInfo.attendance || "",
    });

    setIsDrawerOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      return;
    }

    if (!userName) {
      return;
    }

    const requestData = {
      userName: userName,
      date: selectedDate.toISOString(),
      mealType: selectedMealType,
      attendance: formData.attendance || "",
      store: formData.store || "",
      amount: formData.amount || "0",
      payer: formData.payer || "",
    };

    try {
      await mealSubmitMutation.mutateAsync(requestData);
      
      // 성공 시 폼 닫기 및 초기화
      setIsDrawerOpen(false);
      setIsEditMode(false);
      setFormData({ payer: "", store: "", amount: "", attendance: "" });
    } catch (error) {
      // 에러는 mutation에서 이미 처리됨
      console.error("Form submit error:", error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeleteMeal = async (date: string) => {
    if (!userName) {
      return;
    }

    const deleteData = {
      userName: userName,
      date: date,
    };

    try {
      await mealDeleteMutation.mutateAsync(deleteData);
    } catch (error) {
      // 에러는 mutation에서 이미 처리됨
      console.error("Meal delete error:", error);
    }
  };

  if (!userName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const fileValidationStatus = getFileValidationStatus();
  const fileValidationMessage = getFileValidationMessage();

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto">
      {/* 헤더 */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
            <p className="text-sm text-muted-foreground">안녕하세요, {userName}님</p>
            {fileValidationStatus && (
              <div className="mt-2">
                {fileValidationStatus === "checking" && (
                  <p className="text-xs text-blue-600">{fileValidationMessage}</p>
                )}
                {fileValidationStatus === "valid" && (
                  <p className="text-xs text-green-600">{fileValidationMessage}</p>
                )}
                {fileValidationStatus === "invalid" && (
                  <p className="text-xs text-red-600">{fileValidationMessage}</p>
                )}
              </div>
            )}
          </div>
          <Button onClick={handleLogout} variant="outline">
            로그아웃
          </Button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-6 bg-gray-100">
        {/* 금액 계산 결과 */}
        <Card className="mb-8 border-none shadow-none">
          <CardHeader className="mb-4">
            <CardTitle className="text-3xl font-semibold mb-6">
              {currentMonth}<span className="text-lg">월</span>
            </CardTitle>
            <Alert className="bg-blue-50 border-none">
              <AlertTitle className="text-md font-light">현재까지 200,000원 남으셨네요!</AlertTitle>
            </Alert>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <ChartPieDonut
                availableAmount={calculationData?.availableAmount || 0}
                totalUsed={calculationData?.totalUsed || 0}
                className="relative"
              />
              <CalculationResult 
                userName={userName} 
                month={currentMonth}
                year={currentYear}
                onDataChange={setCalculationData} 
              />
            </div>
          </CardContent>
        </Card>

        {/* 식사 기록 섹션 */}
        <div className="space-y-6">
          <Calendar21 onDateSelect={setSelectedDate} selectedDate={selectedDate} onMonthChange={handleMonthChange} mealData={mealData} />
          <div className="mt-4">
            <MealCards selectedDate={selectedDate} onAddMeal={handleAddMeal} onEditMeal={handleEditMeal} onHolidayEdit={handleHolidayAttendanceEdit} mealData={mealData} />
          </div>
        </div>
      </main>

      {/* Lazy-loaded Meal Entry Drawer */}
      <Suspense
        fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        }
      >
        <MealEntryDrawer
          isOpen={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          selectedMealType={selectedMealType}
          setSelectedMealType={setSelectedMealType}
          isEditMode={isEditMode}
          formData={formData}
          selectedDate={selectedDate}
          onFormSubmit={handleFormSubmit}
          onInputChange={handleInputChange}
          onDeleteMeal={handleDeleteMeal}
        />
      </Suspense>
    </div>
  );
}