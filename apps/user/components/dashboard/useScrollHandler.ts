import { useEffect, useRef } from "react";

export function useScrollHandler(setIsHeaderVisible: (visible: boolean) => void) {
  const lastScrollY = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 스크롤이 100px 이상일 때 헤더 숨김
      if (currentScrollY > 100) {
        const scrollDifference = currentScrollY - lastScrollY.current;

        if (scrollDifference > 5) {
          // 아래로 스크롤 - 헤더 숨김
          setIsHeaderVisible(false);
        } else if (scrollDifference < -5) {
          // 위로 스크롤 - 헤더 표시
          setIsHeaderVisible(true);
        }
      } else {
        // 상단 100px 이내에서는 항상 헤더 표시
        setIsHeaderVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [setIsHeaderVisible]);

  return lastScrollY;
}