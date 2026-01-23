import { useEffect, useRef, useState } from 'react';

type UseClickOutsideReturn<T extends HTMLElement> = {
  ref: React.RefObject<T | null>;
  isActive: boolean;
  setIsActive: (value: boolean) => void;
  activate: () => void;
  deactivate: () => void;
};

export const useClickOutside = <T extends HTMLElement = HTMLDivElement>(
  initialState: boolean = false
): UseClickOutsideReturn<T> => {
  const [isActive, setIsActive] = useState(initialState);
  const ref = useRef<T>(null);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsActive(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const activate = () => setIsActive(true);
  const deactivate = () => setIsActive(false);

  return {
    ref,
    isActive,
    setIsActive,
    activate,
    deactivate,
  };
};