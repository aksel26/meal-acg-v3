import { create } from "zustand";
import { FormData, MealData } from "@/components/dashboard/types";

interface MealDrawerState {
  // Drawer state
  isOpen: boolean;
  isEditMode: boolean;
  selectedMealType: "breakfast" | "lunch" | "dinner";
  selectedDate: Date | undefined;

  // Form data
  formData: FormData;

  // Actions
  openDrawer: (mealType: "breakfast" | "lunch" | "dinner", date: Date | undefined) => void;
  openDrawerForEdit: (mealType: "breakfast" | "lunch" | "dinner", mealInfo: MealData, date: Date | undefined) => void;
  openDrawerForHolidayEdit: (mealInfo: MealData, date: Date | undefined) => void;
  closeDrawer: () => void;
  setSelectedMealType: (type: "breakfast" | "lunch" | "dinner") => void;
  updateFormField: (field: string, value: string) => void;
  resetForm: () => void;
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

export const useMealDrawerStore = create<MealDrawerState>((set, get) => ({
  // Initial state
  isOpen: false,
  isEditMode: false,
  selectedMealType: "lunch",
  selectedDate: undefined,
  formData: initialFormData,

  // Actions
  openDrawer: (mealType, date) => {
    set({
      isOpen: true,
      isEditMode: false,
      selectedMealType: mealType,
      selectedDate: date,
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

    set({
      isOpen: true,
      isEditMode: true,
      selectedMealType: mealType,
      selectedDate: date,
      formData: updatedFormData,
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

    set({
      isOpen: true,
      isEditMode: true,
      selectedMealType: "lunch",
      selectedDate: date,
      formData: updatedFormData,
    });
  },

  closeDrawer: () => {
    set({
      isOpen: false,
      isEditMode: false,
      formData: initialFormData,
    });
  },

  setSelectedMealType: (type) => {
    set({ selectedMealType: type });
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
    set({ formData: initialFormData });
  },
}));
