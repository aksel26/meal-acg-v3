"use client";

import React from 'react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const navItems = [
    {
      id: 'lunch',
      label: '점심조',
      icon: '🍙'
    },
    {
      id: 'lottery',
      label: '뽑기',
      icon: '🎰'
    },
    {
      id: 'monthly',
      label: '먼쓸리',
      icon: '📅'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 z-50 shadow-lg">
      <div className="flex justify-around items-center py-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-all duration-200 ${
              activeTab === item.id
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-2xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}