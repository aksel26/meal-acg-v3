"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@repo/ui/src/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/src/card";
import Calendar21 from "@repo/ui/src/calendar-21";
import { Plus } from "@repo/ui/icons";
import { toast } from "@repo/ui/src/sonner";

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

function CalculationResult({ userName }: { userName: string }) {
  const [data, setData] = useState<CalculationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    const fetchCalculation = async () => {
      if (!userName) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/semester/calculate?month=${selectedMonth}&name=${encodeURIComponent(userName)}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "계산 실패");
        }
        
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        console.error("Calculation error:", err);
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    };

    fetchCalculation();
  }, [userName, selectedMonth]);

  if (loading) {
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
        <p className="text-red-600 mb-4">{error}</p>
        <Button 
          onClick={() => setSelectedMonth(selectedMonth)}
          variant="outline"
          size="sm"
        >
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{data.month}월 근무 현황</h3>
          <p className="text-sm text-muted-foreground">{data.fileName}</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-1 border rounded-md text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>
                {month}월
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{data.workDays}</div>
          <div className="text-sm text-blue-700">근무일</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{data.holidayWorkDays}</div>
          <div className="text-sm text-orange-700">휴일근무</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{data.vacationDays}</div>
          <div className="text-sm text-red-700">휴가일</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {data.availableAmount.toLocaleString()}
          </div>
          <div className="text-sm text-green-700">사용가능 금액</div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold">총 사용 금액</div>
            <div className="text-2xl font-bold text-red-600">
              {data.totalUsed.toLocaleString()}원
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">잔액</div>
            <div className={`text-2xl font-bold ${data.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.balance.toLocaleString()}원
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">계산 공식</div>
            <div className="text-sm text-muted-foreground">
              (근무일 + 휴일근무) × 10,000 - 휴가일 × 10,000
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [userName, setUserName] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem("name");
    if (!name) {
      // 로그인되지 않은 경우 메인 페이지로 리다이렉트
      router.push("/");
      return;
    }
    setUserName(name);
  }, [router]);

  const handleLogout = () => {
    toast.success("로그아웃 해");
    // localStorage.removeItem("name");
    // router.push("/");
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
          </div>
          <Button onClick={handleLogout} variant="outline">
            로그아웃
          </Button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 반기별 엑셀 파일 읽기 카드 */}
          {/* <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">📊</span>
                <CardTitle className="text-lg">반기별 엑셀 파일 읽기</CardTitle>
              </div>
              <CardDescription>현재 날짜 기준으로 반기 폴더를 찾아 특정 셀 값을 읽습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/semester">시작하기</Link>
              </Button>
            </CardContent>
          </Card> */}

          {/* Google Drive 파일 조회 카드 */}
          {/* <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🗂️</span>
                <CardTitle className="text-lg">Google Drive 파일 조회</CardTitle>
              </div>
              <CardDescription>서비스 계정으로 Google Drive 파일 목록을 조회합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="outline">
                <Link href="/drive">파일 조회</Link>
              </Button>
            </CardContent>
          </Card> */}

          {/* API 테스트 카드 */}
          {/* <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🧪</span>
                <CardTitle className="text-lg">API 테스트</CardTitle>
              </div>
              <CardDescription>다양한 Google Drive API 기능을 테스트할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="ghost">
                <Link href="/test">테스트 시작</Link>
              </Button>
            </CardContent>
          </Card> */}

          {/* 금액 계산 결과 */}
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle className="text-xl">💰 금액 계산 결과</CardTitle>
              <CardDescription>선택한 월의 근무 현황 및 금액 정보</CardDescription>
            </CardHeader>
            <CardContent>
              <CalculationResult userName={userName} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-12">
          <Calendar21 />
          <div className="flex flex-col gap-y-3 mt-4">
            <div className="flex w-full items-center justify-between px-1">
              <div className="text-sm font-medium">2025-08-01</div>
              <Button variant="ghost" size="icon" className="size-6" title="Add Event">
                <Plus />
                <span className="sr-only">Add Event</span>
              </Button>
            </div>
            <div className="flex w-full flex-col gap-2">
              {[{ title: "asdfadf" }, { title: "asdfadf" }, { title: "asdfadf" }].map((event, index) => (
                <Card key={index} className="bg-gray-50 p-2 pl-6 text-sm shadow-none rounded-md border-0 hover:bg-gray-200/60 cursor-pointer">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-muted-foreground text-xs">
                    {/* {formatDateRange(new Date(event.from), new Date(event.to))} */}
                    2025-08-01
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* 사용자 정보 섹션 */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">사용자 정보</CardTitle>
              <CardDescription>현재 로그인된 사용자의 정보입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium text-foreground">사용자명:</span>
                  <span className="text-muted-foreground">{userName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium text-foreground">로그인 시간:</span>
                  <span className="text-muted-foreground">{new Date().toLocaleString("ko-KR")}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-foreground">세션 상태:</span>
                  <span className="text-green-600 font-medium">활성화</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 최근 활동 섹션 */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">빠른 시작 가이드</CardTitle>
              <CardDescription>주요 기능을 빠르게 시작하는 방법입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-lg">1️⃣</span>
                  <div>
                    <h4 className="font-medium text-foreground">반기 폴더 확인</h4>
                    <p className="text-sm text-muted-foreground">Google Drive에서 현재 반기에 해당하는 폴더가 있는지 확인하세요</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-lg">2️⃣</span>
                  <div>
                    <h4 className="font-medium text-foreground">파일 공유 설정</h4>
                    <p className="text-sm text-muted-foreground">서비스 계정(hr-tech@meal-acg.iam.gserviceaccount.com)과 파일을 공유하세요</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-lg">3️⃣</span>
                  <div>
                    <h4 className="font-medium text-foreground">엑셀 파일 읽기</h4>
                    <p className="text-sm text-muted-foreground">반기별 엑셀 파일 읽기 기능을 사용하여 특정 셀 값을 조회하세요</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
