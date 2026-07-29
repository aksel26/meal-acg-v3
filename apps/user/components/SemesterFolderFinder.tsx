"use client";

import { useState, useEffect } from 'react';

interface SemesterInfo {
  year: number;
  semester: string;
  folderName: string;
  month: number;
}

interface FolderInfo {
  id: string;
  name: string;
  webViewLink?: string;
  source: 'personal' | 'shared_drive';
  sharedDriveName?: string;
  sharedDriveId?: string;
}

interface Props {
  onFolderFound: (semesterInfo: SemesterInfo, folder: FolderInfo) => void;
}

export default function SemesterFolderFinder({ onFolderFound }: Props) {
  const [loading, setLoading] = useState(false);
  const [semesterInfo, setSemesterInfo] = useState<SemesterInfo | null>(null);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchFolders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/semester/folder');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '폴더 검색에 실패했습니다.');
      }
      
      setSemesterInfo(data.semesterInfo);
      setFolders(data.folders || []);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchFolders();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-16 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">폴더 검색 오류</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={searchFolders}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">1. 반기 폴더 찾기</h2>
      
      {semesterInfo && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">현재 반기 정보</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <p><strong>년도:</strong> {semesterInfo.year}년</p>
              <p><strong>반기:</strong> {semesterInfo.semester}</p>
            </div>
            <div>
              <p><strong>현재 월:</strong> {semesterInfo.month}월</p>
              <p><strong>찾는 폴더명:</strong> {semesterInfo.folderName}</p>
            </div>
          </div>
        </div>
      )}

      {folders.length === 0 ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">폴더를 찾을 수 없습니다</h3>
          <p className="text-yellow-700 mb-3">
            &apos;{semesterInfo?.folderName}&apos; 폴더가 존재하지 않거나 접근 권한이 없습니다.
          </p>
          <div className="text-sm text-yellow-700">
            <p className="mb-2"><strong>해결 방법:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Google Drive에서 &apos;{semesterInfo?.folderName}&apos; 폴더를 생성하세요</li>
              <li>기존 폴더가 있다면 서비스 계정과 공유하세요</li>
              <li>공유 드라이브에 폴더를 만들고 서비스 계정을 멤버로 추가하세요</li>
            </ul>
          </div>
          <button
            onClick={searchFolders}
            className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            다시 검색
          </button>
        </div>
      ) : (
        <div>
          <h3 className="font-semibold mb-3">찾은 폴더 ({folders.length}개)</h3>
          <div className="space-y-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => onFolderFound(semesterInfo!, folder)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{folder.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        folder.source === 'personal' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {folder.source === 'personal' ? '개인 드라이브' : '공유 드라이브'}
                      </span>
                      {folder.sharedDriveName && (
                        <span className="text-blue-600">📁 {folder.sharedDriveName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {folder.webViewLink && (
                      <a
                        href={folder.webViewLink}
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