import * as React from "react";
import { Button } from "@repo/ui/src/button";
import { Plus } from "@repo/ui/icons";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@repo/ui/src/card";

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

interface MealCardsProps {
  selectedDate?: Date;
  onAddMeal?: (mealType: "breakfast" | "lunch" | "dinner") => void;
  onEditMeal?: (mealType: "breakfast" | "lunch" | "dinner", mealInfo: MealData) => void;
  onHolidayEdit?: (mealInfo: MealData) => void;
  mealData?: MealData[];
}

export function MealCards({ selectedDate, onAddMeal, onEditMeal, onHolidayEdit, mealData = [] }: MealCardsProps) {
  const [currentMealData, setCurrentMealData] = React.useState<MealData | null>(null);

  React.useEffect(() => {
    if (selectedDate && mealData.length > 0) {
      const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      const dayData = mealData.find((meal) => meal.date === dateString) || null;
      setCurrentMealData(dayData);
    } else {
      setCurrentMealData(null);
    }
  }, [selectedDate, mealData]);

  if (!selectedDate) {
    return <div className="text-center py-4 text-muted-foreground">날짜를 선택해주세요</div>;
  }

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const hasMealData = currentMealData && (currentMealData.breakfast || currentMealData.lunch || currentMealData.dinner || currentMealData.attendance);

  if (!hasMealData) {
    return (
      <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle>
            <div className="flex w-full items-center justify-between px-2">
              <div className="text-md font-semibold text-gray-800">{formatDate(selectedDate)}</div>
              <Button variant="ghost" size="icon" className="size-8 hover:bg-blue-50" title="Add Event" onClick={() => onAddMeal?.("lunch")}>
                <Plus className="w-4 h-4 text-blue-600" />
                <span className="sr-only">Add Event</span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-gray-500 text-sm text-center">이 날짜에 등록된 식대 기록이 없습니다</p>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => onAddMeal?.("lunch")}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg py-5.5"
          >
            식대 기록 추가하기
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const meals = [
    {
      title: "조식",
      data: currentMealData.breakfast,
      type: "breakfast" as const,
    },
    {
      title: "중식",
      data: currentMealData.lunch,
      type: "lunch" as const,
    },
    {
      title: "석식",
      data: currentMealData.dinner,
      type: "dinner" as const,
    },
  ];

  const visibleMeals = meals.filter((meal) => meal.data);

  const isHoliday = (attendance: string): boolean => {
    return Boolean(attendance && attendance.includes("휴무"));
  };

  return (
    <Card className="space-y-4 bg-white border-none shadow-none">
      {/* Header */}
      <CardHeader className="mb-0">
        <CardTitle>
          <div className="flex w-full items-center justify-between px-2">
            <div className="text-md font-semibold text-gray-800">{formatDate(selectedDate)}</div>
            <Button variant="ghost" size="icon" className="size-8 hover:bg-blue-50" title="Add Event" onClick={() => onAddMeal?.("lunch")}>
              <Plus className="w-4 h-4 text-blue-600" />
              <span className="sr-only">Add Event</span>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {currentMealData && isHoliday(currentMealData.attendance) ? (
        <>
          <CardContent className="flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-2xl">🏖️</span>
            </div>
            <p className="text-orange-600 text-base font-medium mb-2 text-center">휴무일</p>
            <p className="text-gray-500 text-sm text-center">휴무일에는 식대가 제공되지 않습니다</p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => {
                if (currentMealData && onHolidayEdit) {
                  onHolidayEdit(currentMealData);
                }
              }}
              variant="outline"
              className="border-orange-200 text-orange-600 hover:bg-orange-50 rounded-lg py-5.5 font-medium w-full"
            >
              근태 상태 수정하기
            </Button>
          </CardFooter>
        </>
      ) : !hasMealData ? (
        <>
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm text-center">아직 식사 기록이 없어요</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => onAddMeal?.("lunch")} className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-6 py-3 font-medium">
              식사 기록하기
            </Button>
          </CardFooter>
        </>
      ) : (
        <>
          <CardContent>
            <div className="space-y-2">
              {visibleMeals.map((meal, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (currentMealData && onEditMeal) {
                      onEditMeal(meal.type, currentMealData);
                    } else {
                      onAddMeal?.(meal.type);
                    }
                  }}
                  className="bg-[#0a2165]/85  border border-gray-100 rounded-xl p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200 "
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mr-3">
                      <span className="text-2xl">🍙</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-200 text-sm">{meal.title}</span>
                        <span className="font-bold text-white text-base">{meal.data?.amount ? `-${meal.data.amount.toLocaleString()}원` : "0원"}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-200 text-xs">{meal.data?.store || "식당 정보 없음"}</span>
                        {meal.data?.payer && <span className="text-gray-200 text-xs">{meal.data.payer}</span>}
                      </div>
                    </div>

                    <svg className="w-5 h-5 text-gray-300 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}
