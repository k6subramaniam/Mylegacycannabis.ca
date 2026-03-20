import { useParams, Link } from 'wouter';
import SEOHead from '@/components/SEOHead';
import { Breadcrumbs } from '@/components/Layout';
import { useCart } from '@/contexts/CartContext';
import { shippingZones, FREE_SHIPPING_THRESHOLD, calculatePointsEarned } from '@/lib/data';
import { ShoppingCart, Minus, Plus, Truck, Star, Shield, Clock, Gift, ArrowRight, Loader } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { trpc } from '@/lib/trpc';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading } = trpc.store.product.useQuery({ slug: slug || '' });
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <Loader className="animate-spin text-[#4B2D8E]" size={32} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-2xl text-[#4B2D8E] mb-4">PRODUCT NOT FOUND</h1>
        <Link href="/shop" className="text-[#F15929] font-display hover:underline">Back to Shop</Link>
      </div>
    );
  }

  const points = calculatePointsEarned(parseFloat(product.price.toString()) * quantity);

  const handleAddToCart = () => {
    addItem(product as any, quantity);
    toast.success(`${quantity}x ${product.name} added to cart`);
    setQuantity(1);
  };

  return (
    <>
      <SEOHead
        title={`${product.name} — ${product.category}`}
        description={product.shortDescription || product.description || ''}
        canonical={`https://mylegacycannabis.ca/product/${product.slug}`}
        ogType="product"
      />

      <section className="bg-white py-6 md:py-10">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: product.category, href: `/shop?category=${product.category}` }, { label: product.name }]} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            {/* Product Image */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-center bg-[#F5F5F5] rounded-2xl aspect-square overflow-hidden">
              <img src={product.image || 'https://images.unsplash.com/photo-1599599810694-b5ac4dd64b74?w=600'} alt={product.name} className="w-full h-full object-cover" />
            </motion.div>

            {/* Product Details */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="mb-4">
                <span className="inline-block bg-[#F15929] text-white font-display text-xs px-3 py-1 rounded-full mb-3">{product.strainType}</span>
                <h1 className="font-display text-4xl md:text-5xl text-[#4B2D8E] mb-2">{product.name.toUpperCase()}</h1>
                <p className="text-gray-600 font-body">{product.flavor} • {product.weight}</p>
              </div>

              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-display text-4xl text-[#4B2D8E]">${parseFloat(product.price.toString()).toFixed(2)}</span>
                  <span className="text-sm text-gray-500 font-body">THC: {product.thc}</span>
                </div>
                <p className="text-[#F15929] font-display text-sm">Earn {points} points with this purchase</p>
              </div>

              {/* Description */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="font-display text-sm text-[#4B2D8E] mb-2">ABOUT THIS PRODUCT</h3>
                <p className="text-gray-600 font-body text-sm leading-relaxed">{product.description}</p>
              </div>

              {/* Quantity & Add to Cart */}
              <div className="mb-6">
                <label className="block font-display text-sm text-[#4B2D8E] mb-3">QUANTITY</label>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-full border-2 border-[#4B2D8E] text-[#4B2D8E] hover:bg-[#4B2D8E] hover:text-white transition-colors flex items-center justify-center">
                    <Minus size={16} />
                  </button>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 text-center border border-gray-300 rounded-lg py-2 font-display text-lg focus:outline-none focus:ring-2 focus:ring-[#F15929]" />
                  <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-full border-2 border-[#4B2D8E] text-[#4B2D8E] hover:bg-[#4B2D8E] hover:text-white transition-colors flex items-center justify-center">
                    <Plus size={16} />
                  </button>
                </div>
                <button onClick={handleAddToCart} className="w-full bg-[#F15929] hover:bg-[#d94d22] text-white font-display py-4 rounded-full transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                  <ShoppingCart size={20} />
                  ADD TO CART
                </button>
              </div>

              {/* Trust Badges */}
              <div className="space-y-3 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
                    <Truck size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-display text-xs text-[#4B2D8E]">FREE SHIPPING</p>
                    <p className="text-xs text-gray-500 font-body">On orders over ${FREE_SHIPPING_THRESHOLD}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
                    <Shield size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-display text-xs text-[#4B2D8E]">AGE VERIFIED</p>
                    <p className="text-xs text-gray-500 font-body">Secure checkout with ID verification</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#4B2D8E] flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-display text-xs text-[#4B2D8E]">FAST DELIVERY</p>
                    <p className="text-xs text-gray-500 font-body">Nationwide shipping across Canada</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
