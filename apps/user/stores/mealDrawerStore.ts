import { create } from "zustand";
import { FormData, MealData } from "@/components/dashboard/types";

// Step definitions
export type StepId = "mealType" | "attendance" | "receipt" | "payer" | "store" | "amount";

export const STEP_ORDER: StepId[] = ["mealType", "attendance", "receipt", "payer", "store", "amount"];

export const STEP_LABELS: Record<StepId, string> = {
  mealType: "식사 타입",
  attendance: "근태",
  receipt: "영수증",
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
  isManualInput: boolean; // 영수증 스캔 대신 직접 입력 선택 여부

  // Actions
  openDrawer: (mealType: "breakfast" | "lunch" | "dinner", date: Date | undefined) => void;
  openDrawerForEdit: (mealType: "breakfast" | "lunch" | "dinner", mealInfo: MealData, date: Date | undefined) => void;
  openDrawerForHolidayEdit: (mealInfo: MealData, date: Date | undefined) => void;
  closeDrawer: () => void;
  setSelectedMealType: (type: "breakfast" | "lunch" | "dinner") => void;
  updateFormField: (field: string, value: string) => void;
  resetForm: () => void;

  // Step actions
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: StepId) => void;
  completeStep: (step: StepId) => void;
  setManualInput: (value: boolean) => void;
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

// Helper to get next step based on meal type
const getNextStep = (currentStep: StepId, mealType: "breakfast" | "lunch" | "dinner"): StepId | null => {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  let nextIndex = currentIndex + 1;

  // Skip attendance step for non-lunch meals
  const nextStep = STEP_ORDER[nextIndex];
  if (nextStep === "attendance" && mealType !== "lunch") {
    nextIndex++;
  }

  const result = STEP_ORDER[nextIndex];
  return result !== undefined ? result : null;
};

// Helper to get previous step based on meal type
const getPrevStep = (currentStep: StepId, mealType: "breakfast" | "lunch" | "dinner"): StepId | null => {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  let prevIndex = currentIndex - 1;

  // Skip attendance step for non-lunch meals
  const prevStep = STEP_ORDER[prevIndex];
  if (prevStep === "attendance" && mealType !== "lunch") {
    prevIndex--;
  }

  const result = STEP_ORDER[prevIndex];
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
  isManualInput: false,

  // Actions
  openDrawer: (mealType, date) => {
    set({
      isOpen: true,
      isEditMode: false,
      selectedMealType: mealType,
      selectedDate: date,
      currentStep: "mealType",
      completedSteps: [],
      isManualInput: false,
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
      : ["mealType", "payer", "store", "amount"];

    set({
      isOpen: true,
      isEditMode: true,
      selectedMealType: mealType,
      selectedDate: date,
      formData: updatedFormData,
      currentStep: "mealType",
      completedSteps: allSteps,
      isManualInput: true,
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
      isManualInput: true,
    });
  },

  closeDrawer: () => {
    set({
      isOpen: false,
      isEditMode: false,
      formData: initialFormData,
      currentStep: "mealType",
      completedSteps: [],
      isManualInput: false,
    });
  },

  setSelectedMealType: (type) => {
    const { completedSteps } = get();
    // When meal type changes, also complete the mealType step and advance
    const newCompletedSteps = completedSteps.includes("mealType")
      ? completedSteps
      : [...completedSteps, "mealType"];

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

    const updatedFormData = { ...formData };

    // 현재 선택된 식사 타입의 데이터를 복사하고 필드 업데이트
    updatedFormData[selectedMealType] = {
      ...updatedFormData[selectedMealType],
      [field]: value,
    } as any;

    console.log("Updated formData:", updatedFormData);
    set({ formData: updatedFormData });
  },

  resetForm: () => {
    set({
      formData: initialFormData,
      currentStep: "mealType",
      completedSteps: [],
      isManualInput: false,
    });
  },

  // Step actions
  nextStep: () => {
    const { currentStep, selectedMealType, completedSteps } = get();
    const nextStep = getNextStep(currentStep, selectedMealType);

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
    const { currentStep, selectedMealType } = get();
    const prevStep = getPrevStep(currentStep, selectedMealType);

    if (prevStep) {
      set({ currentStep: prevStep });
    }
  },

  goToStep: (step) => {
    set({ currentStep: step });
  },

  completeStep: (step) => {
    const { completedSteps, selectedMealType } = get();
    if (!completedSteps.includes(step)) {
      set({ completedSteps: [...completedSteps, step] });
    }

    // Auto-advance to next step
    const nextStep = getNextStep(step, selectedMealType);
    if (nextStep) {
      set({ currentStep: nextStep });
    }
  },

  setManualInput: (value) => {
    set({ isManualInput: value });
  },

  resetSteps: () => {
    set({
      currentStep: "mealType",
      completedSteps: [],
      isManualInput: false,
    });
  },
}));
