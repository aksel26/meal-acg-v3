"use client";

export const dynamic = "force-dynamic";

import { BottomNavigation } from "@/components/BottomNavigation";
import { MealCards } from "@/components/MealCards";
import { useCalculationData } from "@/hooks/use-calculation-data";
import { useFileValidation } from "@/hooks/use-file-validation";
import { useMealData } from "@/hooks/use-meal-data";
import { useMealDelete } from "@/hooks/use-meal-delete";
import { useMealSubmit } from "@/hooks/use-meal-submit";
import Notice from "@/public/images/Notice.png";
import { ChevronRight as ChevronRightIcon, Copy } from "@repo/ui/icons";
import { Button } from "@repo/ui/src/button";
// import Calendar21 from "../../../../../packages/ui/dist/src/calendarComponent";
import CalendarComponent from "@/components/Calendar";
import { Footer } from "@/components/Footer";
import { Alert, AlertTitle } from "@repo/ui/src/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/src/card";
import { ChartPieDonut } from "@repo/ui/src/chart-pie-donut";
import { Sheet, SheetTrigger } from "@repo/ui/src/sheet";
import { toast } from "@repo/ui/src/sonner";
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatDateKorean } from "utils";

// Lazy load the MealEntryDrawer component
const MealEntryDrawer = lazy(() =>
  import("@/components/MealEntryDrawer").then((module) => ({
    default: module.default,
  }))
);

// Lazy load the MealEntrySheet component for testing
const MealEntrySheet = lazy(() =>
  import("@/components/MealEntrySheet").then((module) => ({
    default: module.default,
  }))
);

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

function CalculationResult({
  userName,
  month,
  year,
  onDataChange,
}: {
  userName: string;
  month: number;
  year: number;
  onDataChange?: (data: CalculationData | null) => void;
}) {
  const { data, isLoading, error, refetch } = useCalculationData(
    userName,
    month,
    year
  );

  useEffect(() => {
    onDataChange?.(data || null);
  }, [data, onDataChange]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded-md mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <div className="w-6 h-6 text-red-500">⚠️</div>
          </div>
          <p className="text-gray-600 text-sm">{error.message}</p>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="text-xs rounded-full"
          >
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <span className="text-sm">데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "근무일",
      value: data.workDays,
      bg: "bg-white",
      text: "text-[#0a2165]",
    },
    {
      label: "휴일근무",
      value: data.holidayWorkDays,
      bg: "bg-white",
      text: "text-[#0a2165]",
    },
    {
      label: "휴가일",
      value: data.vacationDays,
      bg: "bg-orange-50",
      text: "text-orange-400",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className={`${stat.bg} ${stat.text} rounded-xl p-4 transition-all hover:shadow-lg backdrop-blur-lg`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.2 }}
            className={`text-2xl font-bold mb-1`}
          >
            {stat.value}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.3 }}
            className="text-xs font-medium"
          >
            {stat.label}
          </motion.div>
        </motion.div>
      ))}
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [currentMonth, setCurrentMonth] = useState<number>(
    new Date().getMonth() + 1
  );
  const [currentYear, setCurrentYear] = useState<number>(
    new Date().getFullYear()
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [selectedMealType, setSelectedMealType] = useState<
    "breakfast" | "lunch" | "dinner"
  >("lunch");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [calculationData, setCalculationData] =
    useState<CalculationData | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
  const [formData, setFormData] = useState({
    breakfast: {
      payer: "",
      store: "",
      amount: "",
    },
    lunch: {
      payer: "",
      store: "",
      amount: "",
      attendance: "",
    },
    dinner: {
      payer: "",
      store: "",
      amount: "",
    },
  });
  const router = useRouter();
  const lastScrollY = useRef<number>(0);

  // TanStack Query hooks 사용
  const { data: mealData = [] } = useMealData(
    userName,
    currentMonth,
    currentYear
  );
  const {
    data: fileValidationData,
    isLoading: fileValidationLoading,
    error: fileValidationError,
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
    if (fileValidationData)
      return `✅ ${fileValidationData.semesterInfo.folderName}에서 ${fileValidationData.totalFiles}개 파일 발견`;
    return "";
  };

  // useEffect(() => {
  //   onHolidayFetch(8,2025)
  // }, [])

  useEffect(() => {
    const name = localStorage.getItem("name");
    if (!name) {
      router.push("/");
      return;
    }
    setUserName(name);
  }, [router]);

  // 스크롤 효과를 위한 useEffect
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      console.log("Current scroll Y:", currentScrollY);

      // 스크롤이 100px 이상일 때 헤더 숨김
      if (currentScrollY > 100) {
        const scrollDifference = currentScrollY - lastScrollY.current;

        if (scrollDifference > 5) {
          // 아래로 스크롤 - 헤더 숨김
          console.log("Hiding header");
          setIsHeaderVisible(false);
        } else if (scrollDifference < -5) {
          // 위로 스크롤 - 헤더 표시
          console.log("Showing header");
          setIsHeaderVisible(true);
        }
      } else {
        // 상단 100px 이내에서는 항상 헤더 표시
        setIsHeaderVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const handleLogout = () => {
    localStorage.removeItem("name");
    router.push("/");
  };

  const copyAccound = () => {
    const accountNumber = "국민 005701-04-142344 ㈜에이시지알"; // 여기에 실제 계좌번호를 넣으세요
    navigator.clipboard
      .writeText(accountNumber)
      .then(() => {
        toast.success("계좌번호가 복사되었습니다.");
      })
      .catch((err) => {
        console.error("계좌번호 복사 실패:", err);
        toast.error("계좌번호 복사에 실패했습니다.");
      });
  };

  const handleAddMeal = (mealType: "breakfast" | "lunch" | "dinner") => {
    setSelectedMealType(mealType);
    setIsEditMode(false);
    // 각 식사 타입별로 독립적인 form 초기화는 하지 않음 (기존 데이터 유지)
    setIsDrawerOpen(true);
  };

  const handleEditMeal = (
    mealType: "breakfast" | "lunch" | "dinner",
    mealInfo: MealData
  ) => {
    setSelectedMealType(mealType);
    setIsEditMode(true);

    const mealTypeData = mealInfo[mealType];
    setFormData((prev) => ({
      ...prev,
      [mealType]: {
        payer: mealTypeData?.payer || "",
        store: mealTypeData?.store || "",
        amount: mealTypeData?.amount?.toString() || "",
        ...(mealType === "lunch" && { attendance: mealInfo.attendance || "" }),
      },
    }));

    setIsDrawerOpen(true);
  };

  const handleHolidayAttendanceEdit = (mealInfo: MealData) => {
    setSelectedMealType("lunch");
    setIsEditMode(true);

    setFormData((prev) => ({
      ...prev,
      lunch: {
        payer: "",
        store: "",
        amount: "",
        attendance: mealInfo.attendance || "",
      },
    }));

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

    // 3개 독립된 form 데이터를 한번에 전송
    const requestData = {
      userName: userName,
      date: selectedDate.toISOString(),
      breakfast: {
        store: formData.breakfast.store || "",
        amount: formData.breakfast.amount || "0",
        payer: formData.breakfast.payer || "",
      },
      lunch: {
        store: formData.lunch.store || "",
        amount: formData.lunch.amount || "0",
        payer: formData.lunch.payer || "",
        attendance: formData.lunch.attendance || "",
      },
      dinner: {
        store: formData.dinner.store || "",
        amount: formData.dinner.amount || "0",
        payer: formData.dinner.payer || "",
      },
    };
    console.log("requestData: ", requestData);

    try {
      await mealSubmitMutation.mutateAsync(requestData);

      // 성공 시 폼 닫기 및 모든 form 초기화
      setIsDrawerOpen(false);
      setIsEditMode(false);
      setFormData({
        breakfast: {
          payer: "",
          store: "",
          amount: "",
        },
        lunch: {
          payer: "",
          store: "",
          amount: "",
          attendance: "",
        },
        dinner: {
          payer: "",
          store: "",
          amount: "",
        },
      });
    } catch (error) {
      // 에러는 mutation에서 이미 처리됨
      console.error("Form submit error:", error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [selectedMealType]: {
        ...prev[selectedMealType],
        [field]: value,
      },
    }));
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

  const checkNotice = () => {
    window.open(
      "https://hammerhead-magician-201.notion.site/v1-3-257643bd2c6b80798c8bcc2d44103ed7?source=copy_link",
      "_blank"
    );
  };

  const handleDrawerOpenChange = (open: boolean) => {
    setIsDrawerOpen(open);

    // Dialog가 닫힐 때 모든 form 초기화
    if (!open) {
      setFormData({
        breakfast: {
          payer: "",
          store: "",
          amount: "",
        },
        lunch: {
          payer: "",
          store: "",
          amount: "",
          attendance: "",
        },
        dinner: {
          payer: "",
          store: "",
          amount: "",
        },
      });
      setIsEditMode(false);
    }
  };
  const balance = useMemo(() => {
    if (
      calculationData?.availableAmount &&
      calculationData?.totalUsed !== undefined
    ) {
      const result =
        calculationData.availableAmount - calculationData.totalUsed;
      return {
        value: result.toLocaleString("ko-KR"),
        isNegative: result < 0,
      };
    }
    return null;
  }, [calculationData]);

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
    <React.Fragment>
      {/* 인사말 섹션 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.1,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Card className="mb-4 border-none shadow-none">
          <CardHeader>
            <CardTitle>
              <p className="text-base sm:text-lg text-foreground mb-2 font-medium">
                안녕하세요, {userName}님 👋
              </p>
              <p className="text-sm font-light text-gray-400">
                오늘은{" "}
                <span className="text-gray-900">{formatDateKorean()}</span>{" "}
                입니다
              </p>
            </CardTitle>
          </CardHeader>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.2,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Alert
          className="mb-4 border-none bg-blue-50 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10 hover:scale-102"
          onClick={checkNotice}
        >
          <AlertTitle>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-5">
                {/* Notice Icon */}
                <div className="w-10 h-10 bg-white rounded-full relative">
                  <motion.div
                    className="w-11 h-11 absolute left-0 -top-1"
                    animate={{
                      scale: [1, 1.15, 1],
                      rotate: [0, -5, 5, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      repeatDelay: 0.4,
                      ease: "easeInOut",
                    }}
                  >
                    <Image src={Notice} alt="notice" />
                  </motion.div>
                </div>
                <p className="text-sm text-blue-500">
                  [공지] <br />
                  식대앱이 업데이트 되었습니다! (v1.3)
                </p>
              </div>
              <ChevronRightIcon color="#2c7fff" />
            </div>
          </AlertTitle>
        </Alert>
      </motion.div>

      {/* 잔액 및 차트 섹션 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Card className="mb-4 border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex justify-between items-end mb-4">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium ">{currentMonth}월 잔액</p>
                <p
                  className={`text-2xl font-black ${balance?.isNegative ? "text-red-600" : ""}`}
                >
                  {balance ? `${balance.value}원` : "계산 중..."}
                </p>
              </div>
              <Button
                variant={"ghost"}
                onClick={copyAccound}
                className="text-xs"
              >
                <Copy fontSize={15} />
                계좌번호 복사
              </Button>
            </div>
            {calculationData ? (
              <ChartPieDonut
                availableAmount={calculationData.availableAmount || 0}
                totalUsed={calculationData.totalUsed || 0}
                className="relative"
              />
            ) : (
              <div className="relative h-64 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
                <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 근무일/휴일근무/휴가일 통계 섹션 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.4,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Card className="mb-8 p-0 border-none shadow-none bg-transparent">
          {/* <CardContent className="pt-0"> */}
          <CalculationResult
            userName={userName}
            month={currentMonth}
            year={currentYear}
            onDataChange={setCalculationData}
          />
          {/* </CardContent> */}
        </Card>
      </motion.div>

      {/* 식사 기록 섹션 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.5,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <CalendarComponent
          onDateSelect={setSelectedDate}
          selectedDate={selectedDate}
          onMonthChange={handleMonthChange}
          mealData={mealData}
        />
        <MealCards
          selectedDate={selectedDate}
          onAddMeal={handleAddMeal}
          onEditMeal={handleEditMeal}
          onHolidayEdit={handleHolidayAttendanceEdit}
          mealData={mealData}
        />
      </motion.div>

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
          onOpenChange={handleDrawerOpenChange}
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

      {/* Lazy-loaded Meal Entry Sheet for Testing */}
      <Suspense
        fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        }
      >
        <MealEntrySheet
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
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

      {/* Bottom Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Footer />
      </motion.div>
      <BottomNavigation />
    </React.Fragment>
  );
}
