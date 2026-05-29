'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { CartItem, SparePart } from '@/lib/types';

interface CartState {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (part: SparePart, quantity?: number) => void;
  removeItem: (partId: string) => void;
  updateQuantity: (partId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((part: SparePart, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.part.id === part.id);
      if (existing) {
        return prev.map((i) =>
          i.part.id === part.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, part.stockQuantity) }
            : i,
        );
      }
      return [...prev, { part, quantity: Math.min(quantity, part.stockQuantity) }];
    });
  }, []);

  const removeItem = useCallback((partId: string) => {
    setItems((prev) => prev.filter((i) => i.part.id !== partId));
  }, []);

  const updateQuantity = useCallback((partId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.part.id !== partId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.part.id === partId
          ? { ...i, quantity: Math.min(quantity, i.part.stockQuantity) }
          : i,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + Number(i.part.price) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, count, total, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
