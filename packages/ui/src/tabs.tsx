// import { cn } from '@/utils/cn'
import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
// import { cn } from "../lib/utils"

//you handle routing logic. Code is not complex, just play with it and you gonna figure out how it works.
export const Tabs: React.FC<{ tabs: string[] }> = ({ tabs }) => {
  const fired = useRef(false);
  const defaultSelectedTabIndex = 0;
  const [currentLink, setCurrentLink] = useState<{
    index: number;
    left: undefined | number;
    width: undefined | number;
  }>({
    index: defaultSelectedTabIndex,
    left: undefined,
    width: undefined,
  });

  /**
   * TailwindCSS scans your codebase and based on that generates styles
   * TailwindCSS does not allow to concatenate class names, so just wrote down all possible combinations (you can add more if you need, you got the idea)
   * read https://tailwindcss.com/docs/content-configuration#dynamic-class-names
   * you can not do like this - `[&:nth-child(${child})]:bg-neutral-950` it won't work
   */
  const defaultSelectedTabStyles = [
    "[&:nth-child(1)]:dark:bg-white [&:nth-child(1)]:bg-neutral-950",
    "[&:nth-child(2)]:dark:bg-white [&:nth-child(2)]:bg-neutral-950",
    "[&:nth-child(3)]:dark:bg-white [&:nth-child(3)]:bg-neutral-950",
    "[&:nth-child(4)]:dark:bg-white [&:nth-child(4)]:bg-neutral-950",
  ];

  useEffect(() => {
    setCurrentLink(() => ({
      left: document.getElementById("uuu-btn-" + defaultSelectedTabIndex)?.offsetLeft,
      width: document.getElementById("uuu-btn-" + defaultSelectedTabIndex)?.getBoundingClientRect().width,
      index: defaultSelectedTabIndex,
    }));
  }, []);

  return (
    <div className={"w-full relative dark:border-neutral-800 border-neutral-100 rounded-md flex gap-5 items-center justify-between p-2 backdrop-blur-2xl"}>
      {tabs.map((link, i) => (
        <button
          key={i}
          id={"uuu-btn-" + i}
          onClick={() => {
            fired.current = true;
            setCurrentLink(() => ({
              left: document.getElementById("uuu-btn-" + i)?.offsetLeft,
              width: document.getElementById("uuu-btn-" + i)?.getBoundingClientRect().width,
              index: i,
            }));
          }}
          className={twMerge(
            "transition-colors duration-200 sm:text-sm text-xs flex items-center justify-center rounded-lg h-fit px-6 py-1.5 text-nowrap border flex-1",
            currentLink.index === i && "dark:text-neutral-900 text-white",
            fired.current ? "" : defaultSelectedTabStyles[defaultSelectedTabIndex]
          )}
        >
          {link}
        </button>
      ))}
      <div className={"absolute inset-0 h-full p-2 -z-[1] overflow-hidden"}>
        <div className={"relative h-full w-full overflow-hidden"}>
          <div
            style={{
              left: `calc(${currentLink.left || 0}px - 0.75rem + 0.25rem)`,
              width: `${currentLink.width || 0}px`,
            }}
            className={twMerge(
              `transition-[color,left,width] duration-300 absolute top-1/2 -translate-y-1/2 h-full rounded-full -z-[1]`,
              //just skips animation on page load
              fired.current ? "dark:bg-white bg-neutral-950" : "bg-transparent"
            )}
          />
        </div>
      </div>
    </div>
  );
};
