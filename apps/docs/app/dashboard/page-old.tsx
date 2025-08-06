"use client";

import { Alert, AlertTitle } from "@repo/ui/src/alert";
import { Button } from "@repo/ui/src/button";
import Calendar21 from "@repo/ui/src/calendar-21";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/src/card";
import { ChartPieDonut } from "@repo/ui/src/chart-pie-donut";
import { toast } from "@repo/ui/src/sonner";
import { useRouter } from "next/navigation";
import { Suspense, lazy, useEffect, useState } from "react";
import { MealCards } from "../../components/MealCards";
import { useCalculationData } from "../../hooks/use-calculation-data";
import { useMealData } from "../../hooks/use-meal-data";
import { useFileValidation } from "../../hooks/use-file-validation";
import { useMealSubmit } from "../../hooks/use-meal-submit";

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
      {/* <div className="bg-green-50 p-4 rounded-lg">
        <div className="text-xl font-bold text-green-600">{data.availableAmount.toLocaleString()}</div>
        <div className="text-sm text-green-700">사용가능 금액</div>
      </div> */}
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

      {/* <div className="border-t pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold">총 사용 금액</div>
            <div className="text-2xl font-bold text-red-600">{data.totalUsed.toLocaleString()}원</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">잔액</div>
            <div className={`text-2xl font-bold ${data.balance >= 0 ? "text-green-600" : "text-red-600"}`}>{data.balance.toLocaleString()}원</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">계산 공식</div>
            <div className="text-sm text-muted-foreground">(근무일 + 휴일근무) × 10,000 - 휴가일 × 10,000</div>
          </div>
        </div>
      </div> */}
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
  const { data: mealData = [], isLoading: mealDataLoading } = useMealData(userName, currentMonth, currentYear);
  const { 
    data: fileValidationData, 
    isLoading: fileValidationLoading, 
    error: fileValidationError 
  } = useFileValidation(userName, currentMonth, currentYear);
  const mealSubmitMutation = useMealSubmit();

  // 파일 존재 여부 검증
  const validateUserFile = async (name: string, month: number, year: number) => {
    setFileValidationStatus("checking");
    try {
      const response = await fetch(`/api/files?name=${encodeURIComponent(name)}&month=${month}&year=${year}`);

      if (response.ok) {
        const result = await response.json();
        setFileValidationStatus("valid");
        setFileValidationMessage(`✅ ${result.data.semesterInfo.folderName}에서 ${result.data.totalFiles}개 파일 발견`);
      } else {
        const errorData = await response.json();
        setFileValidationStatus("invalid");
        setFileValidationMessage(`⚠️ ${errorData.details || errorData.error || "파일을 찾을 수 없습니다."}`);
      }
    } catch (error) {
      console.error("File validation error:", error);
      setFileValidationStatus("invalid");
      setFileValidationMessage("⚠️ 파일 검증 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const name = localStorage.getItem("name");
    if (!name) {
      // 로그인되지 않은 경우 메인 페이지로 리다이렉트
      router.push("/");
      return;
    }
    setUserName(name);

    // 파일 존재 여부 검증
    validateUserFile(name, currentMonth, currentYear);
  }, [router, currentMonth, currentYear]);

  const getCacheKey = (month: number, year: number, userName: string) => {
    return `meal_data_${userName}_${month}_${year}`;
  };

  const fetchMealData = async (month: number, year: number) => {
    if (!userName) return;

    const cacheKey = getCacheKey(month, year, userName);

    // Try to get from sessionStorage first
    try {
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setMealData(parsedData);
        return;
      }
    } catch (error) {
      console.error("Error reading from sessionStorage:", error);
    }

    // Fetch from API if not in cache
    try {
      const response = await fetch(`/api/calendar/meals?month=${month}&name=${encodeURIComponent(userName)}`);
      if (response.ok) {
        const result = await response.json();
        const mealDataResult = result.data || [];
        setMealData(mealDataResult);

        // Save to sessionStorage
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(mealDataResult));
        } catch (error) {
          console.error("Error saving to sessionStorage:", error);
        }
      }
    } catch (error) {
      console.error("Failed to fetch meal data:", error);
    }
  };

  // Initial fetch when userName is set
  useEffect(() => {
    if (userName) {
      fetchMealData(currentMonth, currentYear);
    }
  }, [userName, currentMonth, currentYear]);

  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
    fetchMealData(month, year);

    // 월 변경 시 파일 검증 재실행
    if (userName) {
      validateUserFile(userName, month, year);
    }
  };

  const handleLogout = () => {
    toast.success("로그아웃 해");
    // localStorage.removeItem("name");
    // router.push("/");
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

    // 해당 식사 타입의 데이터로 폼 초기화
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
    setSelectedMealType("lunch"); // 기본값으로 중식 설정
    setIsEditMode(true);

    // 근태만 수정할 수 있도록 폼 초기화 (식사 정보는 비워둠)
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
      toast.error("날짜를 선택해주세요.");
      return;
    }

    if (!userName) {
      toast.error("사용자 정보를 찾을 수 없습니다.");
      return;
    }

    const mealTypeKorean = selectedMealType === "breakfast" ? "조식" : selectedMealType === "lunch" ? "중식" : "석식";
    
    try {
      // 로딩 토스트 표시
      const loadingToast = toast.loading(`${mealTypeKorean} 기록을 ${isEditMode ? "수정" : "저장"}하는 중...`);

      const requestData = {
        userName: userName,
        date: selectedDate.toISOString(),
        mealType: selectedMealType,
        attendance: formData.attendance || "",
        store: formData.store || "",
        amount: formData.amount || "0",
        payer: formData.payer || "",
      };

      console.log(`Submitting meal data:`, requestData);

      const response = await fetch("/api/meals/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      // 로딩 토스트 제거
      toast.dismiss(loadingToast);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "식사 기록 저장에 실패했습니다.");
      }

      const result = await response.json();
      console.log("Submit result:", result);

      // 성공 토스트 표시
      toast.success(`${mealTypeKorean} 기록이 ${isEditMode ? "수정" : "저장"}되었습니다.`);

      // 폼 닫기 및 초기화
      setIsDrawerOpen(false);
      setIsEditMode(false);
      setFormData({ payer: "", store: "", amount: "", attendance: "" });

      // 캐시 무효화 및 데이터 새로고침
      const cacheKey = getCacheKey(currentMonth, currentYear, userName);
      sessionStorage.removeItem(cacheKey);
      fetchMealData(currentMonth, currentYear);

    } catch (error) {
      console.error("Form submit error:", error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast.error(`${mealTypeKorean} 기록 ${isEditMode ? "수정" : "저장"}에 실패했습니다: ${errorMessage}`);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!userName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
                {fileValidationStatus === "checking" && <p className="text-xs text-blue-600">📁 파일 확인 중...</p>}
                {fileValidationStatus === "valid" && <p className="text-xs text-green-600">{fileValidationMessage}</p>}
                {fileValidationStatus === "invalid" && <p className="text-xs text-red-600">{fileValidationMessage}</p>}
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
              8<span className="text-lg">월</span>
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
                month={calculationData?.month || new Date().getMonth() + 1}
                className="relative"
              />
              <CalculationResult userName={userName} onDataChange={setCalculationData} />
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
        />
      </Suspense>
    </div>
  );
}
