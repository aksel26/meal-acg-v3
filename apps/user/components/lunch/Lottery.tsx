"use client";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useLunchGroupAssign } from "@/hooks/useLunchGroupAssign";

interface Card {
  id: number;
  emoji: string;
  number: number;
  isSelected: boolean;
  isFlipped: boolean;
}

const Lottery = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const shuffleTimelineRef = useRef<gsap.core.Timeline | null>(null);

  // Lunch group assignment mutation
  const assignMutation = useLunchGroupAssign();

  // 사용자 이름 가져오기
  const getUserName = () => {
    return localStorage.getItem("name") || "익명";
  };

  // 초기 카드 생성
  useEffect(() => {
    // 카드 이모지 배열
    const emojis = ["🍎", "🍊", "🍌", "🍇", "🍓", "🥝", "🍑", "🍒", "🥭", "🍍", "🥥", "🫐", "🍈", "🍉", "🍋", "🥑", "🍅", "🥕", "🌽", "🥒", "🥬", "🥦", "🍆", "🥔", "🧄", "🧅", "🌶️", "🫑", "🥖", "🍞"];

    const initialCards: Card[] = Array.from({ length: 30 }, (_, index) => ({
      id: index,
      emoji: emojis[index % emojis.length] || "🍎", // fallback emoji
      number: index + 1,
      isSelected: false,
      isFlipped: false,
    }));
    setCards(initialCards);
  }, []);

  // 카드들을 랜덤한 위치에 배치
  useEffect(() => {
    if (cards.length > 0 && containerRef.current) {
      const container = containerRef.current;
      const cardElements = container.querySelectorAll(".card");

      cardElements.forEach((card) => {
        const randomX = Math.random() * (container.offsetWidth - 80);
        const randomY = Math.random() * (container.offsetHeight - 100);
        const randomRotation = Math.random() * 360;

        gsap.set(card, {
          x: randomX,
          y: randomY,
          rotation: randomRotation,
        });
      });
    }
  }, [cards]);

  // 카드 섞기 애니메이션
  const shuffleCards = async () => {
    if (!containerRef.current || isShuffling) return;

    setIsShuffling(true);
    setAssignmentResult(null);
    setShowSuccessMessage(false);

    // 카드 섞기 시작과 동시에 API 호출
    const assignmentPromise = handleLunchGroupAssignment();

    const container = containerRef.current;
    const cardElements = container.querySelectorAll(".card");

    // 기존 애니메이션이 있다면 중지
    if (shuffleTimelineRef.current) {
      shuffleTimelineRef.current.kill();
    }

    // 선택된 카드가 있었다면 모든 카드를 다시 이모지 면으로 리셋
    gsap.set(".card-inner", { rotationY: 0 });
    gsap.set(cardElements, { opacity: 1, scale: 1, zIndex: 1 });

    // 계속 반복되는 섞기 애니메이션 생성
    const createContinuousShuffleAnimation = () => {
      const shuffleAnimation = gsap.timeline({ repeat: -1 });

      cardElements.forEach((card) => {
        const newX = Math.random() * (container.offsetWidth - 80);
        const newY = Math.random() * (container.offsetHeight - 100);
        const newRotation = Math.random() * 720;

        shuffleAnimation.to(
          card,
          {
            x: newX,
            y: newY,
            rotation: newRotation,
            duration: 0.6,
            ease: "power1.inOut",
          },
          0
        );
      });

      shuffleAnimation.call(() => {
        // 각 루프마다 새로운 랜덤 위치 생성
        cardElements.forEach((card) => {
          const newX = Math.random() * (container.offsetWidth - 80);
          const newY = Math.random() * (container.offsetHeight - 100);
          const newRotation = Math.random() * 720;

          gsap.to(card, {
            x: newX,
            y: newY,
            rotation: newRotation,
            duration: 0.6,
            ease: "power1.inOut",
          });
        });
      });

      return shuffleAnimation;
    };

    // 연속 셔플 애니메이션 시작
    shuffleTimelineRef.current = createContinuousShuffleAnimation();

    // 3초 후 배정된 그룹 번호에 해당하는 카드 선택 (API 응답 대기)
    setTimeout(async () => {
      const groupNumber = await assignmentPromise; // API 응답 완료까지 대기
      selectCardByGroupNumber(groupNumber);
    }, 3000);
  };

  // 점심조 배정 처리 (카드 섞기 시작 시 호출)
  const handleLunchGroupAssignment = async () => {
    const userName = getUserName();
    try {
      const result = await assignMutation.mutateAsync({ userName });
      // 성공 메시지는 카드가 뒤집힌 후에 표시하므로 여기서는 저장만
      setAssignmentResult(`${result.data.groupNumber}조에 배정되었습니다!`);
      return result.data.groupNumber;
    } catch (error) {
      // 배정 실패 시 셔플 중지
      setIsShuffling(false);
      if (shuffleTimelineRef.current) {
        shuffleTimelineRef.current.kill();
        shuffleTimelineRef.current = null;
      }

      const errorMessage = error instanceof Error ? error.message : "배정에 실패했습니다.";
      console.log("errorMessage:", errorMessage);
      setAssignmentResult(errorMessage);
      return null;
    }
  };

  // 배정된 그룹 번호에 해당하는 카드 선택 및 중앙 이동
  const selectCardByGroupNumber = (groupNumber: number | null) => {
    if (!containerRef.current || !groupNumber) return;

    // 연속 셔플 애니메이션 중지
    if (shuffleTimelineRef.current) {
      shuffleTimelineRef.current.kill();
      shuffleTimelineRef.current = null;
    }

    // 그룹 번호와 일치하는 카드 찾기 (카드 번호 = 조 번호)
    const targetCardIndex = cards.findIndex((card) => card.number === groupNumber);
    if (targetCardIndex === -1) return;

    const container = containerRef.current;
    const selectedElement = container.querySelector(`[data-card-id="${targetCardIndex}"]`) as HTMLElement;

    if (selectedElement) {
      const centerX = container.offsetWidth / 2 - 40;
      const centerY = container.offsetHeight / 2 - 50;

      // 선택된 카드를 중앙으로 이동하고 강조
      gsap
        .timeline()
        .to(selectedElement, {
          x: centerX,
          y: centerY,
          rotation: 0,
          scale: 1.5,
          zIndex: 100,
          duration: 0.6,
          ease: "back.out(1.7)",
        })
        .to(selectedElement.querySelector(".card-inner"), {
          rotationY: 180,
          duration: 0.4,
          ease: "power2.inOut",
        })
        .call(() => {
          setIsShuffling(false);
          // 카드가 뒤집힌 후 성공 메시지 표시
          setShowSuccessMessage(true);
        });

      // 다른 카드들은 흐리게 처리
      const otherElements = container.querySelectorAll(`[data-card-id]:not([data-card-id="${targetCardIndex}"])`);
      gsap.to(otherElements, {
        opacity: 0.3,
        scale: 0.8,
        duration: 0.4,
      });
    }
  };

  // 초기화

  return (
    <div className={`w-full h-[50vh] flex flex-col relative overflow-hidden  rounded-lg ${isShuffling ? "cursor-not-allowed" : "cursor-pointer"}`} onClick={isShuffling ? undefined : shuffleCards}>
      <div ref={containerRef} className="w-full h-full relative">
        {cards.map((card, index) => (
          <div key={card.id} data-card-id={index} className="card absolute w-15 h-15" style={{ transformStyle: "preserve-3d", pointerEvents: "none" }}>
            <div className="card-inner w-full h-full relative" style={{ transformStyle: "preserve-3d" }}>
              {/* 카드 앞면 (이모지) */}
              <div className="absolute w-full h-full bg-white rounded-lg shadow-lg flex items-center justify-center text-2xl" style={{ backfaceVisibility: "hidden" }}>
                {card.emoji}
              </div>
              {/* 카드 뒷면 (조 번호) */}
              <div
                className="absolute w-full h-full bg-gradient-to-r from-teal-200 to-lime-200 rounded-lg shadow-lg flex flex-col items-center justify-center text-teal-600 font-bold"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <div className="text-2xl">{card.number}조</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* 상태 메시지 */}
      {isShuffling && !assignmentResult?.includes("실패") && <p className="text-center text-gray-600 text-sm">카드를 섞고 있습니다...</p>}
      {/* 실패 메시지는 즉시 표시 */}
      {assignmentResult?.includes("이미") && <p className="text-center text-md font-medium text-red-400">{assignmentResult}</p>}
      {/* 성공 메시지는 카드가 뒤집힌 후에만 표시 */}
      {showSuccessMessage && assignmentResult && !assignmentResult.includes("실패") && <p className="text-center text-lg font-medium text-green-600">{assignmentResult}</p>}
      {assignMutation.isPending && !assignmentResult && <p className="text-center text-blue-500 text-sm">점심조 배정 중...</p>}
    </div>
  );
};

export default Lottery;
