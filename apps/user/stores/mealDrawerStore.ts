import { create } from "zustand";
import { FormData, MealData } from "@/components/dashboard/types";

// Step definitions
export type StepId = "mealType" | "attendance" | "payer" | "store" | "amount";
type MealType = "breakfast" | "lunch" | "dinner";
type EditableMealField = "payer" | "store" | "amount";

// 중식: 근태 먼저, 조식/석식: 식사 타입 먼저
export const STEP_ORDER_LUNCH: StepId[] = ["attendance", "mealType", "payer", "store", "amount"];
export const STEP_ORDER_DINNER: StepId[] = ["attendance", "payer", "store", "amount"];
export const STEP_ORDER_OTHER: StepId[] = ["mealType", "payer", "store", "amount"];

// 기본 스텝 순서 (하위 호환)
export const STEP_ORDER: StepId[] = STEP_ORDER_LUNCH;

// 식대 지원이 안 되는 근태 유형
export const NO_MEAL_SUPPORT_ATTENDANCE = ["오전 반차/휴무", "오후 반차/휴무", "연차/휴무", "재택근무"];
export const DINNER_NO_MEAL_SUPPORT_ATTENDANCE = ["연차/휴무", "재택근무"];
export const INDIVIDUAL_MEAL_ATTENDANCE = "근무(개별식사 / 식사안함)";

export const STEP_LABELS: Record<StepId, string> = {
  mealType: "식사 타입",
  attendance: "근태",
  payer: "결제자",
  store: "식당명",
  amount: "금액",
};

interface MealDrawerState {
  // Drawer state
  isOpen: boolean;
  isEditMode: boolean;
  selectedMealType: "breakfast" | "lunch" | "dinner";
  selectedDate: Date | undefined;

  // Form data
  formData: FormData;

  // Step state
  currentStep: StepId;
  completedSteps: StepId[];

  // Actions
  openDrawer: (mealType: MealType, date: Date | undefined, existingMealData?: MealData) => void;
  openDrawerForEdit: (mealType: MealType, mealInfo: MealData, date: Date | undefined) => void;
  openDrawerForHolidayEdit: (mealInfo: MealData, date: Date | undefined) => void;
  closeDrawer: () => void;
  setSelectedMealType: (type: MealType) => void;
  updateFormField: (field: string, value: string) => void;
  resetForm: () => void;

  // Step actions
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: StepId) => void;
  completeStep: (step: StepId) => void;
  resetSteps: () => void;
}

const initialFormData: FormData = {
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
};

const getStepOrder = (mealType: MealType): StepId[] => {
  if (mealType === "lunch") return STEP_ORDER_LUNCH;
  if (mealType === "dinner") return STEP_ORDER_DINNER;
  return STEP_ORDER_OTHER;
};

export const getFirstStep = (mealType: MealType, _attendance?: string): StepId => {
  if (mealType === "lunch") return "attendance";
  return "payer";
};

const updateMealField = (
  formData: FormData,
  mealType: MealType,
  field: EditableMealField,
  value: string
): FormData => ({
  ...formData,
  [mealType]: {
    ...formData[mealType],
    [field]: value,
  },
});

const isEditableMealField = (field: string): field is EditableMealField => {
  return field === "payer" || field === "store" || field === "amount";
};

// Helper to get next step based on meal type and attendance
const getNextStep = (
  currentStep: StepId,
  mealType: MealType,
  attendance?: string
): StepId | null => {
  const stepOrder = getStepOrder(mealType);
  const currentIndex = stepOrder.indexOf(currentStep);

  // 중식에서 attendance 선택 시 특수 처리
  if (mealType === "lunch" && currentStep === "attendance" && attendance) {
    // 식대 미지원 또는 개별식사인 경우 다음 스텝 없음 (바로 저장)
    if (NO_MEAL_SUPPORT_ATTENDANCE.includes(attendance) || attendance === INDIVIDUAL_MEAL_ATTENDANCE) {
      return null;
    }
    // 근무인 경우: mealType 스킵하고 payer로 이동
    if (attendance === "근무") {
      return "payer";
    }
  }

  if (mealType === "dinner" && currentStep === "attendance" && attendance) {
    if (DINNER_NO_MEAL_SUPPORT_ATTENDANCE.includes(attendance)) {
      return null;
    }
  }

  const nextIndex = currentIndex + 1;
  const result = stepOrder[nextIndex];
  return result !== undefined ? result : null;
};

// Helper to get previous step based on meal type
const getPrevStep = (
  currentStep: StepId,
  mealType: MealType,
  attendance?: string
): StepId | null => {
  const stepOrder = getStepOrder(mealType);
  const currentIndex = stepOrder.indexOf(currentStep);

  // 중식에서 근무 선택 후 payer에서 뒤로가면 attendance로
  if (mealType === "lunch" && currentStep === "payer" && attendance === "근무") {
    return "attendance";
  }

  const prevIndex = currentIndex - 1;
  const result = stepOrder[prevIndex];
  return result !== undefined ? result : null;
};

export const useMealDrawerStore = create<MealDrawerState>((set, get) => ({
  // Initial state
  isOpen: false,
  isEditMode: false,
  selectedMealType: "lunch",
  selectedDate: undefined,
  formData: initialFormData,

  // Step state
  currentStep: "mealType",
  completedSteps: [],

  // Actions
  openDrawer: (mealType, date, existingMealData) => {
    // 기존 데이터가 있으면 모든 식사 타입의 데이터를 유지
    // (MealTypeStep에서 다른 타입을 선택할 수 있으므로 특정 타입을 초기화하지 않음)
    const updatedFormData = { ...initialFormData };
    if (existingMealData) {
      if (existingMealData.breakfast) {
        updatedFormData.breakfast = {
          payer: existingMealData.breakfast.payer || "",
          store: existingMealData.breakfast.store || "",
          amount: existingMealData.breakfast.amount?.toString() || "",
        };
      }
      if (existingMealData.lunch) {
        updatedFormData.lunch = {
          payer: existingMealData.lunch.payer || "",
          store: existingMealData.lunch.store || "",
          amount: existingMealData.lunch.amount?.toString() || "",
          attendance: existingMealData.attendance || "",
        };
      } else if (existingMealData.attendance) {
        // lunch 데이터가 없어도 attendance는 설정
        updatedFormData.lunch = {
          ...updatedFormData.lunch,
          attendance: existingMealData.attendance,
        };
      }
      if (existingMealData.dinner) {
        updatedFormData.dinner = {
          payer: existingMealData.dinner.payer || "",
          store: existingMealData.dinner.store || "",
          amount: existingMealData.dinner.amount?.toString() || "",
        };
      }
    }

    const firstStep = getFirstStep(mealType);

    // 조식/석식 신규 등록: dialog 상단에 근태(있으면)+식사 타입 라벨로 표시
    const initialCompletedSteps: StepId[] = [];
    if (mealType !== "lunch") {
      if (updatedFormData.lunch.attendance?.trim()) {
        initialCompletedSteps.push("attendance");
      }
      initialCompletedSteps.push("mealType");
    }

    set({
      isOpen: true,
      isEditMode: false,
      selectedMealType: mealType,
      selectedDate: date,
      formData: updatedFormData,
      completedSteps: initialCompletedSteps,
      currentStep: firstStep,
    });
  },

  openDrawerForEdit: (mealType, mealInfo, date) => {
    const updatedFormData = { ...get().formData };

    // 모든 식사 타입의 기존 데이터를 로드
    if (mealInfo.breakfast) {
      updatedFormData.breakfast = {
        payer: mealInfo.breakfast.payer || "",
        store: mealInfo.breakfast.store || "",
        amount: mealInfo.breakfast.amount?.toString() || "",
      };
    }

    if (mealInfo.lunch) {
      updatedFormData.lunch = {
        payer: mealInfo.lunch.payer || "",
        store: mealInfo.lunch.store || "",
        amount: mealInfo.lunch.amount?.toString() || "",
        attendance: mealInfo.attendance || "",
      };
    }

    if (mealInfo.dinner) {
      updatedFormData.dinner = {
        payer: mealInfo.dinner.payer || "",
        store: mealInfo.dinner.store || "",
        amount: mealInfo.dinner.amount?.toString() || "",
      };
    }

    // lunch 타입이고 attendance 정보가 있는 경우 lunch 데이터가 없어도 attendance는 설정
    if (mealType === "lunch" && mealInfo.attendance && !mealInfo.lunch) {
      updatedFormData.lunch = {
        ...updatedFormData.lunch,
        attendance: mealInfo.attendance,
      };
    }

    console.log("openDrawerForEdit - loading all existing data:", {
      mealType,
      mealInfo,
      updatedFormData,
    });

    // In edit mode, all steps are completed
    const allSteps: StepId[] = mealType === "lunch"
      ? ["mealType", "attendance", "payer", "store", "amount"]
      : mealType === "dinner" && mealInfo.attendance
        ? ["mealType", "attendance", "payer", "store", "amount"]
        : ["mealType", "payer", "store", "amount"];

    set({
      isOpen: true,
      isEditMode: true,
      selectedMealType: mealType,
      selectedDate: date,
      formData: updatedFormData,
      currentStep: "mealType",
      completedSteps: allSteps,
    });
  },

  openDrawerForHolidayEdit: (mealInfo, date) => {
    const updatedFormData = { ...get().formData };

    // 모든 식사 타입의 기존 데이터를 로드 (holiday edit에서도 기존 데이터 보존)
    if (mealInfo.breakfast) {
      updatedFormData.breakfast = {
        payer: mealInfo.breakfast.payer || "",
        store: mealInfo.breakfast.store || "",
        amount: mealInfo.breakfast.amount?.toString() || "",
      };
    }

    if (mealInfo.lunch) {
      updatedFormData.lunch = {
        payer: mealInfo.lunch.payer || "",
        store: mealInfo.lunch.store || "",
        amount: mealInfo.lunch.amount?.toString() || "",
        attendance: mealInfo.attendance || "",
      };
    } else {
      // lunch 데이터가 없어도 attendance만 설정
      updatedFormData.lunch = {
        payer: "",
        store: "",
        amount: "",
        attendance: mealInfo.attendance || "",
      };
    }

    if (mealInfo.dinner) {
      updatedFormData.dinner = {
        payer: mealInfo.dinner.payer || "",
        store: mealInfo.dinner.store || "",
        amount: mealInfo.dinner.amount?.toString() || "",
      };
    }

    console.log("openDrawerForHolidayEdit - loading all existing data:", {
      mealInfo,
      updatedFormData,
    });

    // In holiday edit mode, all steps are completed
    const allSteps: StepId[] = ["mealType", "attendance", "payer", "store", "amount"];

    set({
      isOpen: true,
      isEditMode: true,
      selectedMealType: "lunch",
      selectedDate: date,
      formData: updatedFormData,
      currentStep: "mealType",
      completedSteps: allSteps,
    });
  },

  closeDrawer: () => {
    set({
      isOpen: false,
      isEditMode: false,
      formData: initialFormData,
      currentStep: "mealType",
      completedSteps: [],
    });
  },

  setSelectedMealType: (type) => {
    const { completedSteps, formData } = get();
    // When meal type changes, also complete the mealType step and advance
    const mealTypeStep: StepId = "mealType";
    const newCompletedSteps: StepId[] = completedSteps.includes(mealTypeStep)
      ? [...completedSteps]
      : [...completedSteps, mealTypeStep];

    const attendance = formData.lunch.attendance?.trim();

    // 근태가 이미 있으면 조식/석식 선택 시 attendance 스텝을 건너뛰고 완료 라벨로 표시
    if (type !== "lunch" && attendance && !newCompletedSteps.includes("attendance")) {
      newCompletedSteps.push("attendance");
    }

    // 석식 + 근태 있음: attendance 스텝 스킵 → payer로 이동
    if (type === "dinner" && attendance) {
      set({
        selectedMealType: type,
        completedSteps: newCompletedSteps,
        currentStep: "payer",
      });
      return;
    }

    // Get next step based on the NEW meal type
    const nextStep = getNextStep("mealType", type);

    set({
      selectedMealType: type,
      completedSteps: newCompletedSteps,
      currentStep: nextStep || "mealType",
    });
  },

  updateFormField: (field, value) => {
    const { selectedMealType, formData } = get();
    console.log(`Updating field: ${field} = ${value} for mealType: ${selectedMealType}`);
    console.log("Current formData before update:", formData);

    let updatedFormData = formData;
    if (isEditableMealField(field)) {
      updatedFormData = updateMealField(formData, selectedMealType, field, value);
    } else if (field === "attendance") {
      updatedFormData = {
        ...formData,
        lunch: {
          ...formData.lunch,
          attendance: value,
        },
      };
    }

    console.log("Updated formData:", updatedFormData);
    set({ formData: updatedFormData });
  },

  resetForm: () => {
    set({
      formData: initialFormData,
      currentStep: "mealType",
      completedSteps: [],
    });
  },

  // Step actions
  nextStep: () => {
    const { currentStep, selectedMealType, completedSteps, formData } = get();
    const attendance = formData.lunch.attendance;
    const nextStep = getNextStep(currentStep, selectedMealType, attendance);

    if (nextStep) {
      // Mark current step as completed if not already
      const newCompletedSteps = completedSteps.includes(currentStep)
        ? completedSteps
        : [...completedSteps, currentStep];

      set({
        currentStep: nextStep,
        completedSteps: newCompletedSteps,
      });
    }
  },

  prevStep: () => {
    const { currentStep, selectedMealType, formData, completedSteps } = get();
    const attendance = formData.lunch.attendance;
    const prevStep = getPrevStep(currentStep, selectedMealType, attendance);

    if (prevStep) {
      const stepOrder = getStepOrder(selectedMealType);
      const prevStepIndex = stepOrder.indexOf(prevStep);

      // Remove all steps after prevStep from completedSteps
      const newCompletedSteps = completedSteps.filter((step) => {
        const stepIndex = stepOrder.indexOf(step);
        return stepIndex < prevStepIndex;
      });

      // Reset form fields for steps after prevStep
      const stepsToReset = stepOrder.slice(prevStepIndex + 1);
      let updatedFormData = formData;

      stepsToReset.forEach((step) => {
        if (isEditableMealField(step)) {
          updatedFormData = updateMealField(updatedFormData, selectedMealType, step, "");
        }
      });

      set({
        currentStep: prevStep,
        completedSteps: newCompletedSteps,
        formData: updatedFormData,
      });
    }
  },

  goToStep: (step) => {
    const { selectedMealType, formData, completedSteps } = get();
    const stepOrder = getStepOrder(selectedMealType);
    const targetStepIndex = stepOrder.indexOf(step);

    // mealType이 현재 타입의 step order에 없는 경우 (예: 석식 수정) 식사 타입 선택 화면으로 전환하며 전체 초기화
    if (step === "mealType" && targetStepIndex === -1) {
      set({
        currentStep: "mealType",
        completedSteps: [],
        formData: {
          ...formData,
          [selectedMealType]: {
            ...formData[selectedMealType],
            payer: "",
            store: "",
            amount: "",
          },
        },
      });
      return;
    }

    // Remove all steps at or after target step from completedSteps
    const newCompletedSteps = completedSteps.filter((s) => {
      const sIndex = stepOrder.indexOf(s);
      return sIndex < targetStepIndex;
    });

    // Reset form fields for steps at or after target step
    const stepsToReset = stepOrder.slice(targetStepIndex);
    let updatedFormData = formData;

    stepsToReset.forEach((s) => {
      if (isEditableMealField(s)) {
        updatedFormData = updateMealField(updatedFormData, selectedMealType, s, "");
      } else if (s === "attendance" && selectedMealType === "lunch") {
        updatedFormData = {
          ...updatedFormData,
          lunch: {
            ...updatedFormData.lunch,
            attendance: "",
          },
        };
      }
    });

    set({
      currentStep: step,
      completedSteps: newCompletedSteps,
      formData: updatedFormData,
    });
  },

  completeStep: (step) => {
    const { completedSteps, selectedMealType, formData } = get();
    const attendance = formData.lunch.attendance;

    if (!completedSteps.includes(step)) {
      set({ completedSteps: [...completedSteps, step] });
    }

    // Auto-advance to next step
    const nextStep = getNextStep(step, selectedMealType, attendance);
    if (nextStep) {
      set({ currentStep: nextStep });
    }
  },

  resetSteps: () => {
    set({
      currentStep: "mealType",
      completedSteps: [],
    });
  },
}));
