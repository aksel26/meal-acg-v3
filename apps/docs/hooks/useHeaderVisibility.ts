import { useEffect, useRef, useState } from "react";

interface UseHeaderVisibilityOptions {
  threshold?: number;
  scrollDifference?: number;
}

export const useHeaderVisibility = (options: UseHeaderVisibilityOptions = {}) => {
  const { threshold = 50, scrollDifference = 5 } = options;
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
  const lastScrollY = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > threshold) {
        const scrollDiff = currentScrollY - lastScrollY.current;

        if (scrollDiff > scrollDifference) {
          setIsHeaderVisible(false);
        } else if (scrollDiff < -scrollDifference) {
          setIsHeaderVisible(true);
        }
      } else {
        setIsHeaderVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold, scrollDifference]);

  return { isHeaderVisible };
};