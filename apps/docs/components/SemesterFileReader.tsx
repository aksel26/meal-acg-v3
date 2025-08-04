"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// 코드 스플리팅을 위한 동적 컴포넌트들
const SemesterFolderFinder = dynamic(() => import('./SemesterFolderFinder'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>,
  ssr: false
});

const ExcelFileFinder = dynamic(() => import('./ExcelFileFinder'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>,
  ssr: false
});

const CellValueReader = dynamic(() => import('./CellValueReader'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>,
  ssr: false
});

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

interface FileInfo {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink?: string;
  isExactMatch: boolean;
}

interface CellData {
  cellAddress: string;
  value: any;
  formattedValue: any;
  sheetName?: string;
  availableSheets?: string[];
  method: string;
}

export default function SemesterFileReader() {
  const [currentStep, setCurrentStep] = useState<'folder' | 'file' | 'cell'>('folder');
  const [semesterInfo, setSemesterInfo] = useState<SemesterInfo | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [cellData, setCellData] = useState<CellData | null>(null);
  const [userName, setUserName] = useState<string>('');

  // 로컬스토리지에서 name 값 읽기
  useEffect(() => {
    const storedName = localStorage.getItem('name');
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  const handleFolderFound = (info: SemesterInfo, folder: FolderInfo) => {
    setSemesterInfo(info);
    setSelectedFolder(folder);
    setCurrentStep('file');
  };

  const handleFileFound = (file: FileInfo) => {
    setSelectedFile(file);
    setCurrentStep('cell');
  };

  const handleCellRead = (data: CellData) => {
    setCellData(data);
  };

  const resetProcess = () => {
    setCurrentStep('folder');
    setSemesterInfo(null);
    setSelectedFolder(null);
    setSelectedFile(null);
    setCellData(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">반기별 엑셀 파일 셀 값 조회</h1>
        <p className="text-gray-600">
          현재 반기 폴더에서 로컬스토리지의 name 값({userName || '설정되지 않음'})과 일치하는 엑셀 파일을 찾아 특정 셀 값을 읽습니다.
        </p>
      </div>

      {/* 프로세스 진행 상태 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center ${currentStep === 'folder' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === 'folder' ? 'border-blue-600 bg-blue-50' : 
              selectedFolder ? 'border-green-600 bg-green-50' : 'border-gray-300'
            }`}>
              {selectedFolder ? '✓' : '1'}
            </div>
            <span className="ml-2 font-medium">폴더 찾기</span>
          </div>
          
          <div className={`flex items-center ${currentStep === 'file' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === 'file' ? 'border-blue-600 bg-blue-50' : 
              selectedFile ? 'border-green-600 bg-green-50' : 'border-gray-300'
            }`}>
              {selectedFile ? '✓' : '2'}
            </div>
            <span className="ml-2 font-medium">파일 찾기</span>
          </div>
          
          <div className={`flex items-center ${currentStep === 'cell' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === 'cell' ? 'border-blue-600 bg-blue-50' : 
              cellData ? 'border-green-600 bg-green-50' : 'border-gray-300'
            }`}>
              {cellData ? '✓' : '3'}
            </div>
            <span className="ml-2 font-medium">셀 값 읽기</span>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`bg-blue-600 h-2 rounded-full transition-all duration-300 ${
              currentStep === 'folder' ? 'w-1/3' : 
              currentStep === 'file' ? 'w-2/3' : 'w-full'
            }`}
          ></div>
        </div>
      </div>

      {/* 로컬스토리지 name 값 설정 */}
      {!userName && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">이름 설정이 필요합니다</h3>
          <p className="text-yellow-700 mb-3">로컬스토리지에 'name' 값이 설정되지 않았습니다.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="이름을 입력하세요"
              className="flex-1 px-3 py-2 border border-yellow-300 rounded"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value;
                  if (value) {
                    localStorage.setItem('name', value);
                    setUserName(value);
                  }
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                if (input.value) {
                  localStorage.setItem('name', input.value);
                  setUserName(input.value);
                }
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              설정
            </button>
          </div>
        </div>
      )}

      {/* 진행 상태에 따른 컴포넌트 렌더링 */}
      {currentStep === 'folder' && (
        <SemesterFolderFinder onFolderFound={handleFolderFound} />
      )}

      {currentStep === 'file' && selectedFolder && (
        <ExcelFileFinder 
          folder={selectedFolder}
          fileName={userName}
          onFileFound={handleFileFound}
          onBack={() => setCurrentStep('folder')}
        />
      )}

      {currentStep === 'cell' && selectedFile && (
        <CellValueReader 
          file={selectedFile}
          folder={selectedFolder!}
          onCellRead={handleCellRead}
          onBack={() => setCurrentStep('file')}
        />
      )}

      {/* 최종 결과 표시 */}
      {cellData && (
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-4">셀 값 조회 완료</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-green-700"><strong>폴더:</strong> {semesterInfo?.folderName}</p>
              <p className="text-sm text-green-700"><strong>파일:</strong> {selectedFile?.name}</p>
              <p className="text-sm text-green-700"><strong>셀 주소:</strong> {cellData.cellAddress}</p>
              {cellData.sheetName && (
                <p className="text-sm text-green-700"><strong>시트:</strong> {cellData.sheetName}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-green-700 mb-2"><strong>셀 값:</strong></p>
              <div className="p-3 bg-white border border-green-300 rounded">
                <span className="text-lg font-mono">{cellData.formattedValue ?? cellData.value ?? 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={resetProcess}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            다시 시작
          </button>
        </div>
      )}
    </div>
  );
}