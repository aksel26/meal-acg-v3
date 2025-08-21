"use client";

import { useState } from 'react';

interface FolderInfo {
  id: string;
  name: string;
  source: 'personal' | 'shared_drive';
  sharedDriveId?: string;
}

interface FileInfo {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink?: string;
}

interface CellData {
  cellAddress: string;
  value: any;
  formattedValue: any;
  sheetName?: string;
  availableSheets?: string[];
  method: string;
}

interface Props {
  file: FileInfo;
  folder: FolderInfo;
  onCellRead: (data: CellData) => void;
  onBack: () => void;
}

export default function CellValueReader({ file, folder, onCellRead, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [cellAddress, setCellAddress] = useState('A1');
  const [sheetName, setSheetName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cellData, setCellData] = useState<CellData | null>(null);

  const readCellValue = async () => {
    if (!cellAddress.trim()) {
      setError('셀 주소를 입력하세요 (예: A1, B2, C10)');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const requestBody = {
        fileId: file.id,
        cellAddress: cellAddress.trim().toUpperCase(),
        source: folder.source,
        sharedDriveId: folder.sharedDriveId
      };

      // 시트명이 지정된 경우 추가
      if (sheetName.trim()) {
        (requestBody as any).sheetName = sheetName.trim();
      }

      const response = await fetch('/api/semester/cell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '셀 값 읽기에 실패했습니다.');
      }
      
      setCellData(data.cellData);
      onCellRead(data.cellData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('excel') || mimeType.includes('ms-excel')) return '📗';
    return '📄';
  };

  const formatFileSize = (size?: string) => {
    if (!size) return 'N/A';
    const bytes = parseInt(size);
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">3. 셀 값 읽기</h2>
        <button
          onClick={onBack}
          className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ← 뒤로
        </button>
      </div>
      
      {/* 파일 정보 */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-3">선택된 파일</h3>
        <div className="flex items-start gap-3">
          <span className="text-3xl">{getFileIcon(file.mimeType)}</span>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-2">{file.name}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <p><strong>크기:</strong> {formatFileSize(file.size)}</p>
              </div>
              <div>
                <p><strong>수정일:</strong> {formatDate(file.modifiedTime)}</p>
              </div>
              <div>
                {file.webViewLink && (
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Drive에서 열기
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 셀 주소 입력 */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">읽을 셀 지정</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              셀 주소 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={cellAddress}
              onChange={(e) => setCellAddress(e.target.value)}
              placeholder="예: A1, B2, C10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Excel 셀 주소 형식 (A1, B2, C10 등)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시트명 (선택사항)
            </label>
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="시트명 (비어있으면 첫 번째 시트)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              지정하지 않으면 첫 번째 시트를 사용
            </p>
          </div>
        </div>
      </div>

      {/* 실행 버튼 */}
      <div className="mb-6">
        <button
          onClick={readCellValue}
          disabled={loading || !cellAddress.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '읽는 중...' : '셀 값 읽기'}
        </button>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">오류 발생</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* 결과 표시 */}
      {cellData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-green-800 font-semibold mb-3">읽기 완료</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-green-700">셀 주소:</p>
                <p className="font-mono text-lg">{cellData.cellAddress}</p>
              </div>
              
              {cellData.sheetName && (
                <div>
                  <p className="text-sm font-medium text-green-700">시트명:</p>
                  <p>{cellData.sheetName}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-green-700">읽기 방법:</p>
                <p className="text-sm">{cellData.method === 'sheets_api' ? 'Google Sheets API' : 'Excel 파일 다운로드'}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-green-700 mb-2">셀 값:</p>
              <div className="p-3 bg-white border border-green-300 rounded-md">
                <span className="text-lg font-mono break-all">
                  {cellData.formattedValue !== null && cellData.formattedValue !== undefined 
                    ? String(cellData.formattedValue)
                    : cellData.value !== null && cellData.value !== undefined 
                    ? String(cellData.value)
                    : '(빈 셀)'}
                </span>
              </div>
            </div>
          </div>

          {/* 사용 가능한 시트 목록 (Excel 파일의 경우) */}
          {cellData.availableSheets && cellData.availableSheets.length > 1 && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-sm font-medium text-green-700 mb-2">이 파일의 시트 목록:</p>
              <div className="flex flex-wrap gap-2">
                {cellData.availableSheets.map((sheet, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 text-xs rounded-full ${
                      sheet === cellData.sheetName
                        ? 'bg-green-200 text-green-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {sheet}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}