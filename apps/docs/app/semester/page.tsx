'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// 코드 스플리팅을 위한 동적 임포트
const SemesterFileReader = dynamic(() => import('../../components/SemesterFileReader'), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  ),
  ssr: false
});

export default function SemesterPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const router = useRouter();

  // 로그인 상태 확인
  useEffect(() => {
    const userName = localStorage.getItem('name');
    if (userName) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const authUrl = process.env.NEXT_PUBLIC_AUTH_URL;
      if (!authUrl) {
        throw new Error('AUTH_URL이 설정되지 않았습니다.');
      }

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '로그인에 실패했습니다.');
      }

      // 로그인 성공 시 userName을 localStorage에 저장
      if (data.userName) {
        localStorage.setItem('name', data.userName);
        setIsLoggedIn(true);
        
        // 대시보드로 이동
        router.push('/dashboard');
      } else {
        throw new Error('사용자 이름을 받아올 수 없습니다.');
      }

    } catch (err) {
      console.error('로그인 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('name');
    setIsLoggedIn(false);
    setFormData({ username: '', password: '' });
  };

  // 로그인된 상태라면 SemesterFileReader 컴포넌트 표시
  if (isLoggedIn) {
    return (
      <div>
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-lg font-semibold">반기별 엑셀 파일 읽기</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                안녕하세요, {localStorage.getItem('name')}님
              </span>
              <button
                onClick={handleLogout}
                className="text-sm bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
        <SemesterFileReader />
      </div>
    );
  }

  // 로그인 폼 표시
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">로그인</h1>
          <p className="text-gray-600">반기별 엑셀 파일 읽기 서비스</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              사용자명
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="사용자명을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            API Endpoint: {process.env.NEXT_PUBLIC_AUTH_URL}
          </p>
        </div>
      </div>
    </div>
  );
}
