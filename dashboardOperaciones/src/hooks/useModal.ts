import { useCallback, useState } from "react";

export type UseModalResult = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export default function useModal(initialOpen = false): UseModalResult {
  const [isOpen, setIsOpen] = useState<boolean>(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return { isOpen, open, close, toggle };
}
