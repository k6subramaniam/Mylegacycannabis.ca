import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Product, RewardTier } from '@/lib/data';
import { FREE_SHIPPING_THRESHOLD, MINIMUM_ORDER, calculatePointsEarned, shippingZones } from '@/lib/data';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  shippingRate: number;
  shippingProvince: string;
  setShippingProvince: (province: string) => void;
  total: number;
  isFreeShipping: boolean;
  freeShippingProgress: number;
  amountToFreeShipping: number;
  meetsMinimum: boolean;
  pointsToEarn: number;
  appliedReward: RewardTier | null;
  applyReward: (tier: RewardTier | null) => void;
  rewardDiscount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('mlc-cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [shippingProvince, setShippingProvince] = useState('ON');
  const [appliedReward, setAppliedReward] = useState<RewardTier | null>(null);

  useEffect(() => {
    localStorage.setItem('mlc-cart', JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.product.id !== productId));
    } else {
      setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity } : i));
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedReward(null);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const freeShippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
  const meetsMinimum = subtotal >= MINIMUM_ORDER;
  const pointsToEarn = calculatePointsEarned(subtotal);

  const rewardDiscount = appliedReward ? Math.min(appliedReward.discount, subtotal * 0.5) : 0;

  const shippingRate = (() => {
    const zone = shippingZones.find(z => z.provinces.includes(shippingProvince));
    if (!zone) return 10;
    return isFreeShipping ? 0 : zone.rate;
  })();

  const total = subtotal - rewardDiscount + shippingRate;

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      itemCount, subtotal, shippingRate, shippingProvince, setShippingProvince,
      total, isFreeShipping, freeShippingProgress, amountToFreeShipping,
      meetsMinimum, pointsToEarn, appliedReward, applyReward: setAppliedReward, rewardDiscount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
