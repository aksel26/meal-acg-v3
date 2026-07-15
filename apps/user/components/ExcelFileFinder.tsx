"use client";

import { useState, useEffect } from 'react';

interface FolderInfo {
  id: string;
  name: string;
  source: 'personal' | 'shared_drive';
  sharedDriveName?: string;
  sharedDriveId?: string;
}

interface FileInfo {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink?: string;
  isExactMatch: boolean;
}

interface Props {
  folder: FolderInfo;
  fileName: string;
  onFileFound: (file: FileInfo) => void;
  onBack: () => void;
}

export default function ExcelFileFinder({ folder, fileName, onFileFound, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchFiles = async () => {
    if (!fileName.trim()) {
      setError('파일명이 설정되지 않았습니다. 로컬스토리지에 name 값을 설정하세요.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/semester/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId: folder.id,
          fileName: fileName,
          source: folder.source,
          sharedDriveId: folder.sharedDriveId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '파일 검색에 실패했습니다.');
      }
      
      setFiles(data.files || []);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (size?: string) => {
    if (!size) return 'N/A';
    const bytes = parseInt(size);
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('excel') || mimeType.includes('ms-excel')) return '📗';
    return '📄';
  };

  useEffect(() => {
    searchFiles();
  }, [folder, fileName]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-20 bg-slate-200 rounded"></div>
            <div className="h-20 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">2. 엑셀 파일 찾기</h2>
        <button
          onClick={onBack}
          className="px-3 py-1 text-sm bg-slate-500 text-white rounded hover:bg-slate-600"
        >
          ← 뒤로
        </button>
      </div>
      
      <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <h3 className="font-semibold text-slate-800 mb-2">검색 조건</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
          <div>
            <p><strong>폴더:</strong> {folder.name}</p>
            <p><strong>파일명:</strong> {fileName}</p>
          </div>
          <div>
            <p><strong>위치:</strong> {folder.source === 'personal' ? '개인 드라이브' : '공유 드라이브'}</p>
            {folder.sharedDriveName && (
              <p><strong>공유 드라이브:</strong> {folder.sharedDriveName}</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">파일 검색 오류</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={searchFiles}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      )}

      {files.length === 0 && !error ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">파일을 찾을 수 없습니다</h3>
          <p className="text-yellow-700 mb-3">
            '{fileName}' 이름과 일치하는 엑셀 파일이 '{folder.name}' 폴더에 없습니다.
          </p>
          <div className="text-sm text-yellow-700">
            <p className="mb-2"><strong>확인사항:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>파일명이 정확한지 확인하세요 (확장자 제외)</li>
              <li>파일이 실제로 해당 폴더에 있는지 확인하세요</li>
              <li>파일이 Excel 형식(.xlsx, .xls) 또는 Google Sheets인지 확인하세요</li>
              <li>파일에 대한 접근 권한이 있는지 확인하세요</li>
            </ul>
          </div>
          <button
            onClick={searchFiles}
            className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            다시 검색
          </button>
        </div>
      ) : (
        <div>
          <h3 className="font-semibold mb-3">찾은 파일 ({files.length}개)</h3>
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className={`p-4 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors ${
                  file.isExactMatch 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-slate-200 hover:border-blue-300'
                }`}
                onClick={() => onFileFound(file)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                      <div>
                        <h4 className="font-medium text-slate-900">{file.name}</h4>
                        {file.isExactMatch && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            정확히 일치
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-slate-600">
                      <div>
                        <p><strong>파일 형식:</strong></p>
                        <p className="text-xs">{file.mimeType.split('/').pop()}</p>
                      </div>
                      <div>
                        <p><strong>크기:</strong></p>
                        <p>{formatFileSize(file.size)}</p>
                      </div>
                      <div>
                        <p><strong>수정일:</strong></p>
                        <p>{formatDate(file.modifiedTime)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Drive에서 열기
                      </a>
                    )}
                    <span className="text-blue-600">선택 →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}