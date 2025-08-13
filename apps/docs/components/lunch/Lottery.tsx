"use client";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

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
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const shuffleTimelineRef = useRef<gsap.core.Timeline | null>(null);

  // 초기 카드 생성
  useEffect(() => {
    // 카드 이모지 배열
    const emojis = ["🍎", "🍊", "🍌", "🍇", "🍓", "🥝", "🍑", "🍒", "🥭", "🍍", "🥥", "🫐", "🍈", "🍉", "🍋", "🥑", "🍅", "🥕", "🌽", "🥒", "🥬", "🥦", "🍆", "🥔", "🧄", "🧅", "🌶️", "🫑", "🥖", "🍞"];

    const initialCards: Card[] = Array.from({ length: 30 }, (_, index) => ({
      id: index,
      emoji: emojis[index % emojis.length],
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
  const shuffleCards = () => {
    if (!containerRef.current || isShuffling) return;

    setIsShuffling(true);
    setSelectedCard(null);

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

    // 3초 후 랜덤 카드 선택
    setTimeout(() => {
      selectRandomCard();
    }, 3000);
  };

  // 랜덤 카드 선택 및 중앙 이동
  const selectRandomCard = () => {
    if (!containerRef.current) return;

    // 연속 셔플 애니메이션 중지
    if (shuffleTimelineRef.current) {
      shuffleTimelineRef.current.kill();
      shuffleTimelineRef.current = null;
    }

    const randomIndex = Math.floor(Math.random() * cards.length);
    const selectedCardData = cards[randomIndex];

    if (selectedCardData) {
      setSelectedCard(selectedCardData);
    }

    const container = containerRef.current;
    const selectedElement = container.querySelector(`[data-card-id="${randomIndex}"]`) as HTMLElement;

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
        });

      // 다른 카드들은 흐리게 처리
      const otherElements = container.querySelectorAll(`[data-card-id]:not([data-card-id="${randomIndex}"])`);
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
              {/* 카드 뒷면 (번호) */}
              <div
                className="absolute w-full h-full bg-gradient-to-r from-teal-200 to-lime-200 rounded-lg shadow-lg  flex items-center justify-center text-teal-600 font-bold text-xl"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                {card.number}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-center">{selectedCard?.number}조에 배정 되었습니다.</p>
      <p className="text-center text-orange-500">이미 점심조 배정이 완료되었습니다.</p>
    </div>
  );
};

export default Lottery;
