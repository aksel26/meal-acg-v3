"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { useLunchGroupAssign } from "@/hooks/useLunchGroupAssign";

// 상태 타입
type Phase = "idle" | "shaking" | "dropping" | "revealing" | "result" | "error";

// 공 데이터
interface Ball {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
}

// 파스텔 컬러 팔레트
const BALL_COLORS = [
  "#FFB3BA", // 파스텔 핑크
  "#FFDFBA", // 파스텔 오렌지
  "#FFFFBA", // 파스텔 옐로우
  "#BAFFC9", // 파스텔 그린
  "#BAE1FF", // 파스텔 블루
  "#E8BAFF", // 파스텔 퍼플
  "#FFB3E6", // 파스텔 마젠타
  "#C9FFBA", // 파스텔 라임
  "#FFCEBA", // 파스텔 피치
  "#BAF0FF", // 파스텔 시안
];

// 공 컴포넌트
const BallComponent = React.forwardRef<HTMLDivElement, { ball: Ball; index: number }>(
  ({ ball, index }, ref) => {
    return (
      <div
        ref={ref}
        data-ball-id={index}
        className="ball absolute rounded-full"
        style={{
          left: `${ball.x}%`,
          top: `${ball.y}%`,
          width: ball.size,
          height: ball.size,
          backgroundColor: ball.color,
          boxShadow: `
            inset -3px -3px 8px rgba(0,0,0,0.15),
            inset 3px 3px 8px rgba(255,255,255,0.5),
            0 2px 4px rgba(0,0,0,0.2)
          `,
        }}
      >
        {/* 하이라이트 */}
        <div
          className="absolute rounded-full bg-white/50"
          style={{
            top: "15%",
            left: "20%",
            width: "30%",
            height: "25%",
          }}
        />
      </div>
    );
  }
);
BallComponent.displayName = "BallComponent";

// 로터리 스위치 컴포넌트
const RotarySwitch = ({
  phase,
  onActivate,
}: {
  phase: Phase;
  onActivate: () => void;
}) => {
  const switchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const switchEl = switchRef.current;
    if (!switchEl) return;

    if (phase === "idle" || phase === "error") {
      gsap.set(switchEl, { rotation: 0 });
    } else if (phase === "dropping") {
      // 스위치 90도 회전
      gsap.to(switchEl, {
        rotation: 90,
        duration: 0.3,
        ease: "power2.out",
      });
    }

    return () => {
      if (switchEl) {
        gsap.killTweensOf(switchEl);
      }
    };
  }, [phase]);

  const isClickable = phase === "shaking";

  return (
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
      {/* 스위치 베이스 */}
      <div className="w-12 h-12 bg-gradient-to-b from-[rgba(14,15,12,0.12)] to-[var(--slate-gray)] rounded-full shadow-lg border-4 border-[rgba(14,15,12,0.08)] flex items-center justify-center">
        {/* 회전하는 스위치 핸들 */}
        <div
          ref={switchRef}
          onClick={isClickable ? onActivate : undefined}
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isClickable ? "cursor-pointer hover:scale-105 transition-transform" : ""
          }`}
          style={{ transformOrigin: "center center" }}
        >
          {/* 스위치 손잡이 */}
          <div className="w-3 h-8 bg-gradient-to-b from-[#e6444a] to-[#d03238] rounded-full shadow-md" />
        </div>
      </div>
      {/* 클릭 안내 */}
      {isClickable && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs text-[#d03238] font-medium animate-pulse">클릭!</span>
        </div>
      )}
    </div>
  );
};

// 결과 공개 컴포넌트
const RevealBall = ({
  phase,
  result,
  ballColor,
}: {
  phase: Phase;
  result: number | null;
  ballColor: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "revealing" && containerRef.current && ballRef.current && resultRef.current) {
      const tl = gsap.timeline();

      // 공 등장
      tl.fromTo(
        containerRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
      );

      // Squash & Stretch 효과
      tl.to(ballRef.current, { scaleX: 1.1, scaleY: 0.9, duration: 0.1 })
        .to(ballRef.current, { scaleX: 0.9, scaleY: 1.1, duration: 0.1 })
        .to(ballRef.current, { scaleX: 1.1, scaleY: 0.9, duration: 0.1 })
        .to(ballRef.current, { scaleX: 0.9, scaleY: 1.1, duration: 0.1 })
        .to(ballRef.current, { scaleX: 1.2, scaleY: 0.85, duration: 0.15 })
        .to(ballRef.current, { scaleX: 1, scaleY: 1, duration: 0.1 });

      // 공이 터지고 결과 표시
      tl.to(ballRef.current, { scale: 1.3, opacity: 0, duration: 0.2 })
        .fromTo(
          resultRef.current,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" },
          "-=0.1"
        );
    }
  }, [phase]);

  if (phase !== "revealing" && phase !== "result") return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-sm rounded-[50%_50%_20%_20%]">
      <div ref={containerRef} className="relative flex items-center justify-center">
        {/* 공 */}
        <div
          ref={ballRef}
          className="w-24 h-24 rounded-full"
          style={{
            backgroundColor: ballColor,
            boxShadow: `
              inset -4px -4px 12px rgba(0,0,0,0.2),
              inset 4px 4px 12px rgba(255,255,255,0.5),
              0 8px 24px rgba(0,0,0,0.3)
            `,
          }}
        >
          <div
            className="absolute rounded-full bg-white/50"
            style={{
              top: "15%",
              left: "20%",
              width: "30%",
              height: "25%",
            }}
          />
        </div>

        {/* 결과 뱃지 */}
        <div ref={resultRef} className="absolute opacity-0">
          <div className="bg-gradient-to-br from-[var(--granite)] to-[var(--ink-black)] text-white px-8 py-4 rounded-2xl shadow-2xl">
            <span className="text-3xl font-bold">{result}조</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const GachaMachine = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const machineRef = useRef<HTMLDivElement>(null);
  const ballRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shakeTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const selectedBallIndexRef = useRef<number>(0);
  const selectedBallColorRef = useRef<string>(BALL_COLORS[0] || "#FFB3BA");

  const assignMutation = useLunchGroupAssign();

  // 공 초기화 - 바닥에 쌓인 형태
  useEffect(() => {
    const generateStackedBalls = (): Ball[] => {
      const newBalls: Ball[] = [];

      // 바닥부터 쌓이는 형태로 배치
      const rows = [
        { y: 75, count: 5, xStart: 10, xGap: 18 },  // 맨 아래
        { y: 58, count: 4, xStart: 18, xGap: 18 },  // 두번째 줄
        { y: 42, count: 3, xStart: 28, xGap: 18 },  // 세번째 줄
        { y: 28, count: 2, xStart: 38, xGap: 18 },  // 네번째 줄
      ];

      let id = 0;
      rows.forEach((row) => {
        for (let i = 0; i < row.count; i++) {
          newBalls.push({
            id: id++,
            x: row.xStart + i * row.xGap + (Math.random() - 0.5) * 4,
            y: row.y + (Math.random() - 0.5) * 3,
            color: BALL_COLORS[id % BALL_COLORS.length] || "#FFB3BA",
            size: 32 + Math.random() * 6,
          });
        }
      });

      return newBalls;
    };

    setBalls(generateStackedBalls());
  }, []);

  // 흔들기 애니메이션 시작
  const startShaking = useCallback(() => {
    if (shakeTimelineRef.current) {
      shakeTimelineRef.current.kill();
    }

    const shakeTl = gsap.timeline({ repeat: -1 });

    // 머신 흔들림
    shakeTl
      .to(machineRef.current, { x: -3, rotation: -0.5, duration: 0.05 })
      .to(machineRef.current, { x: 3, rotation: 0.5, duration: 0.05 })
      .to(machineRef.current, { x: -2, rotation: -0.3, duration: 0.05 })
      .to(machineRef.current, { x: 2, rotation: 0.3, duration: 0.05 })
      .to(machineRef.current, { x: 0, rotation: 0, duration: 0.05 });

    // 공들도 함께 흔들림 (쌓인 상태 유지하면서)
    ballRefs.current.forEach((ballEl, index) => {
      if (!ballEl) return;

      const randomDelay = index * 0.02;
      const jumpHeight = 3 + Math.random() * 4;

      gsap.to(ballEl, {
        y: `-=${jumpHeight}`,
        duration: 0.08,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
        delay: randomDelay,
      });

      gsap.to(ballEl, {
        x: `+=${(Math.random() - 0.5) * 6}`,
        duration: 0.1,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
        delay: randomDelay,
      });
    });

    shakeTimelineRef.current = shakeTl;
  }, []);

  // 흔들기 중지
  const stopShaking = useCallback(() => {
    if (shakeTimelineRef.current) {
      shakeTimelineRef.current.kill();
      shakeTimelineRef.current = null;
    }

    // 모든 공 애니메이션 중지
    ballRefs.current.forEach((ballEl) => {
      if (ballEl) {
        gsap.killTweensOf(ballEl);
        gsap.to(ballEl, { x: 0, y: 0, duration: 0.2 });
      }
    });

    // 머신 원위치
    gsap.to(machineRef.current, { x: 0, rotation: 0, duration: 0.2 });
  }, []);

  // 공 드롭 애니메이션
  const startDropAnimation = useCallback(() => {
    const selectedIndex = selectedBallIndexRef.current;
    const selectedBall = ballRefs.current[selectedIndex];

    if (!selectedBall || !containerRef.current) return;

    setPhase("dropping");

    const tl = gsap.timeline();

    // 선택된 공 아래로 이동
    tl.to(selectedBall, {
      y: 100,
      x: 0,
      duration: 0.5,
      ease: "power2.in",
    });

    // 다른 공들 페이드
    ballRefs.current.forEach((ball, index) => {
      if (ball && index !== selectedIndex) {
        gsap.to(ball, { opacity: 0.3, scale: 0.9, duration: 0.3 });
      }
    });

    // 선택된 공도 페이드 후 결과 공개
    tl.to(selectedBall, { opacity: 0, duration: 0.2 }).call(() => {
      setPhase("revealing");
    });
  }, []);

  // 스위치 클릭 핸들러
  const handleSwitchClick = useCallback(() => {
    if (phase !== "shaking") return;

    stopShaking();
    startDropAnimation();
  }, [phase, stopShaking, startDropAnimation]);

  // 뽑기 버튼 클릭
  const handlePull = useCallback(async () => {
    if (phase !== "idle") return;

    setPhase("shaking");
    setErrorMessage(null);
    const userName = localStorage.getItem("name") || "익명";

    try {
      const response = await assignMutation.mutateAsync({ userName });
      const groupNumber = response.data.groupNumber;
      setResult(groupNumber);

      // 랜덤 공 선택
      const randomIndex = Math.floor(Math.random() * balls.length);
      selectedBallIndexRef.current = randomIndex;
      selectedBallColorRef.current = balls[randomIndex]?.color || BALL_COLORS[0] || "#FFB3BA";

      // 흔들기 시작
      startShaking();

      // 2초 후 자동으로 스위치 돌리기
      setTimeout(() => {
        stopShaking();
        startDropAnimation();
      }, 2000);
    } catch (error) {
      stopShaking();
      const message = error instanceof Error ? error.message : "배정에 실패했습니다.";
      setErrorMessage(message);
      setPhase("error");
    }
  }, [phase, assignMutation, balls, startShaking, stopShaking, startDropAnimation]);

  // 리셋
  const handleReset = useCallback(() => {
    stopShaking();
    setPhase("idle");
    setResult(null);
    setErrorMessage(null);

    ballRefs.current.forEach((el) => {
      if (el) {
        gsap.to(el, { x: 0, y: 0, opacity: 1, scale: 1, duration: 0.3 });
      }
    });
  }, [stopShaking]);

  // 결과 phase 전환
  useEffect(() => {
    if (phase === "revealing") {
      const timer = setTimeout(() => setPhase("result"), 2000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="relative w-full max-w-xs">
        {/* 머신 본체 */}
        <div
          ref={machineRef}
          className="relative bg-gradient-to-b from-[rgba(208,50,56,0.2)] via-[rgba(208,50,56,0.3)] to-[#e6444a] rounded-3xl p-4 shadow-xl border-4 border-[rgba(208,50,56,0.12)]"
        >
          {/* 로터리 스위치 */}
          <RotarySwitch phase={phase} onActivate={handleSwitchClick} />

          {/* 상단 타이틀 */}
          <div className="text-center mb-2 mt-4">
            <span className="text-lg font-bold text-white drop-shadow-md">점심조 뽑기</span>
          </div>

          {/* 투명 돔 */}
          <div
            ref={containerRef}
            className="relative w-full h-48 bg-gradient-to-b from-white/90 to-white/70 rounded-[50%_50%_20%_20%] border-4 border-white/50 overflow-hidden"
            style={{
              boxShadow: "inset 0 8px 32px rgba(255,255,255,0.8), inset 0 -8px 24px rgba(0,0,0,0.05)",
            }}
          >
            {/* 공들 */}
            {balls.map((ball, index) => (
              <BallComponent
                key={ball.id}
                ball={ball}
                index={index}
                ref={(el) => {
                  ballRefs.current[index] = el;
                }}
              />
            ))}

            {/* 결과 오버레이 */}
            <RevealBall phase={phase} result={result} ballColor={selectedBallColorRef.current} />
          </div>

          {/* 출구 */}
          <div className="flex justify-center -mt-1 relative z-10">
            <div className="w-16 h-8 bg-gradient-to-b from-[rgba(14,15,12,0.12)] to-[var(--slate-gray)] rounded-b-xl relative shadow-inner">
              <div className="absolute inset-x-2 top-1.5 h-3 bg-[var(--slate-gray)] rounded" />
            </div>
          </div>

          {/* 버튼 */}
          <div className="mt-4">
            {phase === "idle" && (
              <button
                onClick={handlePull}
                disabled={assignMutation.isPending}
                className="w-full py-3.5 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-[var(--ink-black)] via-[var(--granite)] to-[#2b2d2b] hover:from-[#2b2d2b] hover:via-[#454745] hover:to-[var(--ink-black)] active:scale-[0.98] transition-all shadow-lg disabled:from-[var(--slate-gray)] disabled:to-[var(--slate-gray)] disabled:cursor-not-allowed"
              >
                {assignMutation.isPending ? "처리 중..." : "뽑기!"}
              </button>
            )}

            {phase === "shaking" && (
              <div className="w-full py-3.5 rounded-2xl text-base font-bold text-[#cc4f00] bg-[rgba(255,209,26,0.15)] text-center border-2 border-[rgba(255,192,145,0.4)] animate-pulse">
                흔드는 중...
              </div>
            )}

            {(phase === "dropping" || phase === "revealing") && (
              <div className="w-full py-3.5 rounded-2xl text-base font-bold text-[#4a9b1d] bg-[rgba(159,232,112,0.1)] text-center border-2 border-[rgba(159,232,112,0.3)] animate-pulse">
                두근두근...
              </div>
            )}

            {phase === "result" && (
              <button
                onClick={handleReset}
                className="w-full py-3.5 rounded-2xl text-base font-medium text-[var(--granite)] bg-[var(--whisper-cream)] hover:bg-white transition-colors border-2 border-[rgba(14,15,12,0.12)]"
              >
                다시 하기
              </button>
            )}

            {phase === "error" && (
              <button
                onClick={handleReset}
                className="w-full py-3.5 rounded-2xl text-base font-medium text-[var(--granite)] bg-[var(--whisper-cream)] hover:bg-white transition-colors border-2 border-[rgba(14,15,12,0.12)]"
              >
                다시 시도
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 상태 메시지 */}
      <div className="h-12 flex items-center justify-center">
        {phase === "result" && result && (
          <div className="bg-gradient-to-r from-[#d03238] to-[#ff8833] px-6 py-2.5 rounded-full shadow-lg animate-bounce">
            <p className="text-sm font-bold text-white">{result}조에 배정되었습니다!</p>
          </div>
        )}

        {phase === "error" && errorMessage && (
          <div className="bg-[rgba(208,50,56,0.08)] px-5 py-2.5 rounded-full border border-[rgba(208,50,56,0.2)]">
            <p className="text-sm font-medium text-[#a8181e]">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GachaMachine;
