import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui/src/dialog";
import { Button } from "@repo/ui/src/button";
import { Card, CardContent } from "@repo/ui/src/card";
import { Badge } from "@repo/ui/src/badge";
import { NumberTicker } from "@repo/ui/src/number-ticker";
import { Eye } from "@repo/ui/icons";
import React from "react";

interface Employee {
  id: string;
  name: string;
  position: string;
  team: string;
  totalAmount: number;
  usedAmount: number;
  remainingAmount: number;
}

interface ActivityViewDialogProps {
  selectedMonth: string;
}

export function ActivityViewDialog({ selectedMonth }: ActivityViewDialogProps) {
  // Sample employee data
  const employees: Employee[] = [
    {
      id: "1",
      name: "김철수",
      position: "대리",
      team: "개발팀",
      totalAmount: 50000,
      usedAmount: 35000,
      remainingAmount: 15000,
    },
    {
      id: "2",
      name: "이영희",
      position: "과장",
      team: "기획팀",
      totalAmount: 60000,
      usedAmount: 45000,
      remainingAmount: 15000,
    },
    {
      id: "3",
      name: "박민수",
      position: "차장",
      team: "마케팅팀",
      totalAmount: 70000,
      usedAmount: 60000,
      remainingAmount: 10000,
    },
    {
      id: "4",
      name: "최지연",
      position: "사원",
      team: "개발팀",
      totalAmount: 40000,
      usedAmount: 25000,
      remainingAmount: 15000,
    },
    {
      id: "5",
      name: "정우진",
      position: "팀장",
      team: "영업팀",
      totalAmount: 80000,
      usedAmount: 70000,
      remainingAmount: 10000,
    },
  ];

  const totalSum = employees.reduce((sum, emp) => sum + emp.totalAmount, 0);
  const usedSum = employees.reduce((sum, emp) => sum + emp.usedAmount, 0);
  const remainingSum = employees.reduce((sum, emp) => sum + emp.remainingAmount, 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs">
          <Eye className="w-3 h-3" />
          활동비 전체 조회
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm! sm:max-w-lg! max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-md font-semibold">
            활동비 전체 현황 ({selectedMonth.split("-")[0]}년 {parseInt(selectedMonth.split("-")[1])}월)
          </DialogTitle>
          <p className="text-sm text-gray-500">팀별 활동비 사용 현황을 확인하세요</p>
        </DialogHeader>

        {/* Employee List */}
        <div className="flex-1 overflow-y-auto max-h-[400px]">
          <div className="space-y-3">
            {employees.map((employee) => (
              <Card key={employee.id} className="border-0 border-b  border-b-gray-300 rounded-none shadow-none">
                <CardContent className="py-3 px-0!">
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {employee.position}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{employee.team}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center bg-gray-50 rounded-sm py-2">
                      <p className="text-xs text-gray-500 mb-1">총 금액</p>
                      <p className="font-semibold text-sm text-gray-900">{employee.totalAmount.toLocaleString()}원</p>
                    </div>
                    <div className="text-center bg-red-50/30 rounded-sm py-2">
                      <p className="text-xs text-red-400 mb-1">사용금액</p>
                      <p className="font-semibold text-sm text-red-500">{employee.usedAmount.toLocaleString()}원</p>
                    </div>
                    <div className="text-center bg-lime-50 rounded-sm py-2">
                      <p className="text-xs text-lime-600 mb-1">잔여금액</p>
                      <p className="font-semibold text-sm text-lime-600">{employee.remainingAmount.toLocaleString()}원</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
