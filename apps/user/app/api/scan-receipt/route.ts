import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { ScanReceiptRequest, ScanReceiptResponse, ReceiptScanResult } from "@/lib/types/receipt-types";
import { getSessionUser } from "@/lib/auth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// 날짜 형식 변환 함수 (다양한 형식 → YYYY-MM-DD)
function normalizeDate(dateStr: string): string {
  // 이미 YYYY-MM-DD 형식인 경우
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // YYYY.MM.DD 또는 YYYY/MM/DD 형식
  const dotSlashMatch = dateStr.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})/);
  if (dotSlashMatch) {
    const [, year, month, day] = dotSlashMatch;
    return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
  }

  // YY.MM.DD 또는 YY/MM/DD 형식 (2자리 연도)
  const shortYearMatch = dateStr.match(/^(\d{2})[./](\d{1,2})[./](\d{1,2})/);
  if (shortYearMatch) {
    const [, year, month, day] = shortYearMatch;
    const fullYear = parseInt(year!) > 50 ? `19${year}` : `20${year}`;
    return `${fullYear}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
  }

  // YYYYMMDD 형식
  const compactMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compactMatch) {
    const [, year, month, day] = compactMatch;
    return `${year}-${month}-${day}`;
  }

  // 한국어 형식: YYYY년 MM월 DD일
  const koreanMatch = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (koreanMatch) {
    const [, year, month, day] = koreanMatch;
    return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
  }

  // 파싱 실패 시 오늘 날짜 반환
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

// 금액 추출 함수 (쉼표, 원 등 제거)
function extractAmount(amountStr: string): number {
  const cleanedStr = amountStr.replace(/[^0-9]/g, "");
  return parseInt(cleanedStr, 10) || 0;
}

export async function POST(request: NextRequest): Promise<NextResponse<ScanReceiptResponse>> {
  try {
    // 무인증으로 유료 Gemini API가 호출되지 않도록 로그인 필수
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body: ScanReceiptRequest = await request.json();
    const { image, mimeType } = body;

    // 필수 파라미터 검증
    if (!image || !mimeType) {
      return NextResponse.json(
        {
          success: false,
          error: "이미지와 MIME 타입이 필요합니다.",
        },
        { status: 400 }
      );
    }

    // 지원되는 이미지 형식 검증
    const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!supportedTypes.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: "지원되지 않는 이미지 형식입니다. JPEG, PNG, WebP, HEIC 형식만 지원됩니다.",
        },
        { status: 400 }
      );
    }

    // base64 이미지 크기 검증 (대략 10MB)
    const estimatedSize = (image.length * 3) / 4;
    if (estimatedSize > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: "이미지 파일이 너무 큽니다. 10MB 이하의 파일을 사용해주세요.",
        },
        { status: 400 }
      );
    }

    // Gemini API 호출
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `이 영수증 이미지에서 다음 정보를 추출해주세요. 반드시 아래 JSON 형식으로만 응답해주세요. 다른 텍스트는 포함하지 마세요.

{
  "storeName": "가게/식당 이름",
  "date": "결제 날짜 (YYYY-MM-DD 형식)",
  "totalAmount": 총 결제 금액 (숫자만),
  "confidence": 인식 신뢰도 (0.0 ~ 1.0)
}

주의사항:
- storeName: 가게명, 상호명, 식당명을 찾아주세요. 찾을 수 없으면 빈 문자열로 반환
- date: 결제일, 거래일을 찾아 YYYY-MM-DD 형식으로 변환. 찾을 수 없으면 빈 문자열로 반환
- totalAmount: 합계, 총액, 결제금액 등을 찾아 숫자만 반환. 찾을 수 없으면 0
- confidence: 전체적인 인식 신뢰도 (0.0 ~ 1.0)

JSON만 응답하세요.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: image,
        },
      },
      { text: prompt },
    ]);

    const response = result.response;
    const text = response.text();

    // JSON 파싱
    let parsedResult: {
      storeName?: string;
      date?: string;
      totalAmount?: number | string;
      confidence?: number;
    };

    try {
      // JSON 블록 추출 (```json ... ``` 형식 처리)
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      parsedResult = JSON.parse(jsonStr);
    } catch {
      console.error("JSON 파싱 실패:", text);
      return NextResponse.json(
        {
          success: false,
          error: "영수증 정보를 인식할 수 없습니다. 다른 이미지를 시도해주세요.",
        },
        { status: 422 }
      );
    }

    // 결과 정규화
    const scanResult: ReceiptScanResult = {
      storeName: parsedResult.storeName || "",
      date: parsedResult.date ? normalizeDate(parsedResult.date) : "",
      totalAmount: typeof parsedResult.totalAmount === "string"
        ? extractAmount(parsedResult.totalAmount)
        : (parsedResult.totalAmount || 0),
      confidence: parsedResult.confidence || 0.5,
    };

    // 최소한의 정보라도 인식되었는지 확인
    if (!scanResult.storeName && !scanResult.date && scanResult.totalAmount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "영수증에서 정보를 찾을 수 없습니다. 영수증이 잘 보이는 이미지를 사용해주세요.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: scanResult,
    });
  } catch (error) {
    console.error("Receipt scan API error:", error);

    if (error instanceof Error) {
      // Gemini API 관련 에러
      if (error.message.includes("API key")) {
        return NextResponse.json(
          {
            success: false,
            error: "API 설정 오류가 발생했습니다. 관리자에게 문의해주세요.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "영수증 스캔 중 오류가 발생했습니다. 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
