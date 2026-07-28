import { NextResponse } from "next/server";
import { ValidationError } from "@/lib/validation";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function data<T>(value: T, status = 200) {
  return NextResponse.json({ data: value }, { status });
}

export function route<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
) {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status },
        );
      }

      const message =
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";
      const status =
        typeof error === "object" &&
        error &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : 500;
      console.error("Careers API error:", error);
      return NextResponse.json(
        { error: status < 500 ? message : "요청을 처리하지 못했습니다." },
        { status },
      );
    }
  };
}

export function throwIfError(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.code === "P0002") {
    throw new ApiError("대상을 찾을 수 없습니다.", 404);
  }
  if (error.code === "23505") {
    throw new ApiError("이미 존재하는 데이터입니다.", 409);
  }
  if (error.code === "P0001") {
    throw new ApiError("현재 상태에서는 요청한 변경을 할 수 없습니다.", 409);
  }
  if (
    error.code === "22023" ||
    error.code === "22P02" ||
    error.code === "23502" ||
    error.code === "23503" ||
    error.code === "23514"
  ) {
    throw new ApiError("입력 값이 현재 채용 데이터와 맞지 않습니다.", 400);
  }
  throw new Error(error.message);
}

export function query(request: Request) {
  return new URL(request.url).searchParams;
}
