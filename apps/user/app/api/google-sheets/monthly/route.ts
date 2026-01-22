import { NextResponse } from "next/server";
import { sheets } from "@/lib/google-config";

export interface UserApplication {
  name: string;
  memo?: string;
  drink: string;
}

export interface PickupPerson {
  name: string;
}

export interface DrinkOption {
  name: string;
  available: boolean;
}

interface GoogleSheetData {
  applications: UserApplication[];
  drinkOptions: DrinkOption[];
  pickupPersons: PickupPerson[];
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export async function GET() {
  try {
    if (!SHEET_ID || !sheets) {
      console.warn("Google Sheets configuration not found");
      return NextResponse.json({
        success: true,
        data: {
          applications: [],
          drinkOptions: [],
          pickupPersons: [],
        },
      });
    }

    const ranges = ["Monthly 음료취합!B7:D", "Monthly 음료취합!E4:E", "Monthly 음료취합!H4:H"];
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SHEET_ID,
      ranges,
    });

    const [applicationsData, drinkOptionsData, pickupPersonsData] = response.data.valueRanges.map((range: any) => range.values || []);

    const applications: UserApplication[] = applicationsData
      .filter((row: string[]) => row[0])
      .map((row: string[]) => ({
        name: row[0] || "",
        drink: row[1] || "",
        memo: row[2] || "",
      }));

    const drinkOptions: DrinkOption[] = drinkOptionsData
      .filter((row: string[]) => row[0])
      .map((row: string[]) => ({
        name: row[0],
        available: true,
      }));

    const pickupPersons: PickupPerson[] = pickupPersonsData
      .filter((row: string[]) => row[0])
      .map((row: string[]) => ({
        name: row[0],
      }));

    const data: GoogleSheetData = {
      applications,
      drinkOptions,
      pickupPersons,
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Failed to fetch Google Sheets data:", error);

    return NextResponse.json({
      success: true,
      data: {
        applications: [],
        drinkOptions: [],
        pickupPersons: [],
      },
      warning: "Using fallback data due to API error",
    });
  }
}
