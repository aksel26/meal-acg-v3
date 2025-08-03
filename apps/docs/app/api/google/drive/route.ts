import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      { 
        message: 'Google Drive API 연동 준비됨',
        status: 'ready'
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Google Drive API 오류' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    return NextResponse.json(
      { 
        message: 'Google Drive API 요청 처리됨',
        data: body
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Google Drive API 요청 처리 오류' },
      { status: 500 }
    );
  }
}