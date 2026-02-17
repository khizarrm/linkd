import { useCallback, useEffect, useRef, useState } from "react";

export function useScrollToBottom() {
  const internalRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);
  const isUserScrollingRef = useRef(false);
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    internalRef.current = node;
    setContainerNode(node);
  }, []);

  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

  const checkIfAtBottom = useCallback(() => {
    if (!internalRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = internalRef.current;
    return scrollTop + clientHeight >= scrollHeight - 100;
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (!internalRef.current) return;
      internalRef.current.scrollTo({
        top: internalRef.current.scrollHeight,
        behavior,
      });
    },
    [],
  );

  // Track user scroll events — re-runs when the container element appears/disappears
  useEffect(() => {
    const container = containerNode;
    if (!container) return;

    let scrollTimeout: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      isUserScrollingRef.current = true;
      clearTimeout(scrollTimeout);

      const atBottom = checkIfAtBottom();
      setIsAtBottom(atBottom);
      isAtBottomRef.current = atBottom;

      scrollTimeout = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 150);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [containerNode, checkIfAtBottom]);

  // Auto-scroll when content changes (streaming, new messages, resizing)
  useEffect(() => {
    const container = containerNode;
    if (!container) return;

    const scrollIfNeeded = () => {
      if (isAtBottomRef.current && !isUserScrollingRef.current) {
        requestAnimationFrame(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "instant",
          });
          setIsAtBottom(true);
          isAtBottomRef.current = true;
        });
      }
    };

    const mutationObserver = new MutationObserver(scrollIfNeeded);
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const resizeObserver = new ResizeObserver(scrollIfNeeded);
    resizeObserver.observe(container);
    for (const child of container.children) {
      resizeObserver.observe(child);
    }

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [containerNode]);

  return { containerRef, endRef, isAtBottom, scrollToBottom };
}
