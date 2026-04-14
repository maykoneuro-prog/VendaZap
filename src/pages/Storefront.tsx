import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, limit, getDoc, doc } from 'firebase/firestore';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  CheckCircle2, 
  ArrowRight,
  MessageCircle,
  QrCode,
  Search,
  ChevronLeft,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AdSenseUnit = ({ clientId, slotId }: { clientId: string, slotId?: string }) => {
  useEffect(() => {
    try {
      // Inject AdSense script if not present
      if (!document.querySelector('script[src*="adsbygoogle"]')) {
        const script = document.createElement('script');
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
        script.async = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
      }

      // Initialize ad
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, [clientId, slotId]);

  return (
    <div className="w-full overflow-hidden rounded-[2rem] bg-neutral-50 border border-neutral-100 flex items-center justify-center min-h-[100px]">
      <ins 
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default function Storefront() {
  const { slug } = useParams();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'info' | 'payment' | 'success'>('cart');
  const [customerInfo, setCustomerInfo] = useState({ name: '', whatsapp: '', birthday: '' });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [platformSettings, setPlatformSettings] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;

    const qStore = query(collection(db, 'stores'), where('slug', '==', slug), limit(1));
    const unsubscribeStore = onSnapshot(qStore, (snapshot) => {
      if (!snapshot.empty) {
        const storeData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setStore(storeData);
        
        // Fetch products for this store
        const qProducts = query(collection(db, 'stores', storeData.id, 'products'), where('isActive', '==', true));
        onSnapshot(qProducts, (prodSnapshot) => {
          setProducts(prodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Fetch Platform Settings for Ads
    const fetchPlatformSettings = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'platform', 'settings'));
        if (snapshot.exists()) {
          setPlatformSettings(snapshot.data());
        }
      } catch (error) {
        console.error('Error fetching platform settings:', error);
      }
    };

    fetchPlatformSettings();

    return () => unsubscribeStore();
  }, [slug]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const isStoreOpen = () => {
    if (!store?.openingTime || !store?.closingTime) return true;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [openH, openM] = store.openingTime.split(':').map(Number);
    const [closeH, closeM] = store.closingTime.split(':').map(Number);
    
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  const categories = ['Todos', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCheckout = async () => {
    if (!customerInfo.name || !customerInfo.whatsapp) {
      toast.error('Preencha seu nome e WhatsApp para continuar.');
      return;
    }

    try {
      // 1. Create Order
      const orderData = {
        customerName: customerInfo.name,
        customerWhatsapp: customerInfo.whatsapp,
        customerBirthday: customerInfo.birthday,
        items: cart.map(item => ({ 
          id: item.id, 
          name: item.name, 
          price: item.price, 
          costPrice: item.costPrice || 0,
          quantity: item.quantity 
        })),
        total: cartTotal,
        status: 'pending',
        paymentMethod: 'pix',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'stores', store.id, 'orders'), orderData);

      setCheckoutStep('success');
      
      // 2. Prepare WhatsApp Message
      const message = `Olá! Acabei de fazer um pedido no seu catálogo:\n\n` +
        `*Cliente:* ${customerInfo.name}\n` +
        `*Itens:*\n${cart.map(item => `- ${item.quantity}x ${item.name} (R$ ${item.price.toFixed(2)})`).join('\n')}\n\n` +
        `*Total:* R$ ${cartTotal.toFixed(2)}\n\n` +
        `Poderia me confirmar os dados para entrega?`;
      
      const whatsappUrl = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp after a short delay
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 2000);

    } catch (error) {
      toast.error('Erro ao processar pedido. Tente novamente.');
      console.error(error);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
    </div>
  );

  if (!store) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6 text-center">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Loja não encontrada</h1>
      <p className="text-neutral-500 mb-6">O link que você acessou pode estar incorreto ou a loja não existe mais.</p>
      <a href="/" className="text-neutral-900 font-bold hover:underline">Voltar para o início</a>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-24 font-sans selection:bg-neutral-900 selection:text-white" style={{ '--primary': store.primaryColor || '#171717' } as any}>
      {/* Store Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.logoUrl ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-neutral-100 shadow-sm">
                <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white font-bold shadow-lg shadow-neutral-200">
                {store.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-bold text-neutral-900 leading-none">{store.name}</h1>
              <div className="flex items-center gap-1 mt-1">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  isStoreOpen() ? "bg-green-500" : "bg-red-500"
                )}></div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  {isStoreOpen() ? 'Loja Aberta' : `Fechada (Abre às ${store.openingTime || '08:00'})`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 bg-neutral-50 text-neutral-600 hover:text-neutral-900 rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span 
                  className="absolute -top-1 -right-1 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {cart.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero / Info Section */}
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-4">
        <div className="bg-white rounded-[2.5rem] p-8 border border-neutral-100 shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-neutral-900 tracking-tight">Bem-vindo à nossa loja! 👋</h2>
              <p className="text-neutral-500 max-w-md">Escolha seus produtos favoritos e faça seu pedido pelo WhatsApp de forma rápida e segura.</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-3 py-1 bg-neutral-50 text-neutral-600 rounded-full text-xs font-bold flex items-center gap-1.5 border border-neutral-100">
                  <MessageCircle size={12} className="text-green-500" />
                  Atendimento via WhatsApp
                </span>
                <span className="px-3 py-1 bg-neutral-50 text-neutral-600 rounded-full text-xs font-bold flex items-center gap-1.5 border border-neutral-100">
                  <QrCode size={12} className="text-neutral-400" />
                  Pagamento via Pix
                </span>
              </div>
            </div>
            {store.logoUrl && (
              <div className="hidden md:block w-32 h-32 rounded-3xl overflow-hidden border-4 border-neutral-50 shadow-xl rotate-3">
                <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            )}
          </div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-neutral-50 rounded-full blur-3xl opacity-50"></div>
        </div>
      </div>

      {/* Global Ad Banner */}
      {platformSettings?.showAdsOnStorefront && (
        <div className="max-w-4xl mx-auto px-4 py-2">
          {platformSettings.adType === 'adsense' && platformSettings.adSenseClientId ? (
            <AdSenseUnit 
              clientId={platformSettings.adSenseClientId} 
              slotId={platformSettings.adSenseSlotId} 
            />
          ) : platformSettings.adBannerUrl ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full aspect-[21/9] md:aspect-[32/9] rounded-[2rem] overflow-hidden border border-neutral-100 shadow-sm relative group"
            >
              <a 
                href={platformSettings.adLink || '#'} 
                target={platformSettings.adLink ? "_blank" : "_self"} 
                rel="noreferrer"
                className="block w-full h-full"
              >
                <img 
                  src={platformSettings.adBannerUrl} 
                  alt="Patrocinado" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                  Patrocinado
                </div>
              </a>
            </motion.div>
          ) : null}
        </div>
      )}

      {/* Search & Categories */}
      <div className="max-w-4xl mx-auto px-4 py-6 sticky top-16 z-30 bg-[#FDFDFD]/80 backdrop-blur-md">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text" 
              placeholder="O que você está procurando hoje?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-neutral-200 rounded-2xl outline-none focus:ring-2 focus:ring-neutral-900 transition-all shadow-sm"
            />
          </div>
          
          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {categories.map((cat: any) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border",
                    selectedCategory === cat 
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-lg shadow-neutral-200" 
                      : "bg-white text-neutral-500 border-neutral-100 hover:border-neutral-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-neutral-100">
            <ShoppingBag className="mx-auto text-neutral-100 mb-4" size={80} />
            <h3 className="text-xl font-bold text-neutral-900">Nenhum produto encontrado</h3>
            <p className="text-neutral-500 mt-1">Tente buscar por outro termo ou categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredProducts.map((product, index) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-[2.5rem] overflow-hidden border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-neutral-200/50 transition-all group flex flex-col"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img 
                    src={product.imageUrl || `https://picsum.photos/seed/${product.id}/600/600`} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  {!product.isActive && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                      <span className="px-4 py-2 bg-neutral-900 text-white text-xs font-black uppercase tracking-widest rounded-full">Esgotado</span>
                    </div>
                  )}
                  {product.category && (
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-neutral-900 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm border border-neutral-100">
                        {product.category}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex-1">
                    <h3 className="font-bold text-neutral-900 text-lg group-hover:text-neutral-700 transition-colors">{product.name}</h3>
                    <p className="text-sm text-neutral-500 line-clamp-2 mt-2 leading-relaxed">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Preço</p>
                      <p className="text-xl font-black text-neutral-900">R$ {product.price.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Estoque</p>
                      <p className={cn(
                        "text-xs font-bold",
                        product.stock <= 5 ? "text-red-500" : "text-neutral-500"
                      )}>
                        {product.stock > 0 ? `${product.stock} disponíveis` : 'Esgotado'}
                      </p>
                    </div>
                    <button 
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0 || !isStoreOpen()}
                      className="text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-neutral-200 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="max-w-4xl mx-auto px-4 py-12 text-center opacity-50">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 bg-neutral-900 rounded flex items-center justify-center">
            <ShoppingBag size={12} className="text-white" />
          </div>
          <span className="text-sm font-bold text-neutral-900 tracking-tight">VendaZap</span>
        </div>
        <p className="text-xs text-neutral-500">Tecnologia para pequenos negócios</p>
      </footer>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-[3rem] max-h-[95vh] overflow-hidden flex flex-col max-w-2xl mx-auto shadow-2xl"
            >
              <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-50 rounded-xl">
                    {checkoutStep === 'cart' ? <ShoppingCart size={20} /> : 
                     checkoutStep === 'info' ? <Info size={20} /> : 
                     checkoutStep === 'payment' ? <QrCode size={20} /> : <CheckCircle2 size={20} className="text-green-500" />}
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900">
                    {checkoutStep === 'cart' ? 'Seu Carrinho' : 
                     checkoutStep === 'info' ? 'Seus Dados' : 
                     checkoutStep === 'payment' ? 'Pagamento' : 'Sucesso!'}
                  </h2>
                </div>
                <button onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }} className="p-2 hover:bg-neutral-50 rounded-full transition-colors">
                  <X size={24} className="text-neutral-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {checkoutStep === 'cart' && (
                  <div className="space-y-6">
                    {cart.length === 0 ? (
                      <div className="text-center py-20">
                        <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <ShoppingCart className="text-neutral-200" size={40} />
                        </div>
                        <p className="text-neutral-500 font-medium">Seu carrinho está vazio.</p>
                        <button 
                          onClick={() => setIsCartOpen(false)}
                          className="mt-4 text-sm font-bold text-neutral-900 hover:underline"
                        >
                          Continuar comprando
                        </button>
                      </div>
                    ) : cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 group">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-neutral-100 flex-shrink-0">
                          <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/200/200`} className="w-full h-full object-cover" alt={item.name} referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-neutral-900">{item.name}</p>
                          <p className="text-sm font-bold opacity-60">R$ {item.price.toFixed(2)}</p>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1 hover:underline"
                          >
                            Remover
                          </button>
                        </div>
                        <div className="flex items-center gap-3 bg-neutral-50 rounded-2xl p-1.5 border border-neutral-100">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-xl transition-all">
                            <Minus size={14} />
                          </button>
                          <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-xl transition-all">
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {checkoutStep === 'info' && (
                  <div className="space-y-6">
                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex gap-3">
                      <div className="p-2 bg-white rounded-lg h-fit shadow-sm">
                        <Info size={16} className="text-neutral-400" />
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Precisamos de alguns dados básicos para identificar seu pedido e entrar em contato caso necessário.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Nome Completo</label>
                        <input 
                          type="text" 
                          value={customerInfo.name}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                          className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-2 focus:ring-neutral-900 transition-all font-medium"
                          placeholder="Como podemos te chamar?"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">WhatsApp</label>
                        <input 
                          type="tel" 
                          value={customerInfo.whatsapp}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, whatsapp: e.target.value })}
                          className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-2 focus:ring-neutral-900 transition-all font-medium"
                          placeholder="Ex: 11 99999-9999"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Data de Nascimento (Opcional)</label>
                        <input 
                          type="date" 
                          value={customerInfo.birthday}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, birthday: e.target.value })}
                          className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-2 focus:ring-neutral-900 transition-all font-medium"
                        />
                        <p className="text-[10px] text-neutral-400 mt-2 font-medium">🎁 Gostamos de presentear nossos clientes no aniversário!</p>
                      </div>
                    </div>
                  </div>
                )}

                {checkoutStep === 'payment' && (
                  <div className="space-y-8 text-center">
                    <div className="bg-neutral-50 p-8 rounded-[2.5rem] border border-neutral-100 shadow-inner">
                      <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-6">Pagamento via Pix</p>
                      <div className="flex justify-center mb-6 p-4 bg-white rounded-3xl shadow-sm inline-block mx-auto">
                        <QRCodeSVG value={store.pixKey || 'Chave Pix não configurada'} size={200} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Chave Pix</p>
                        <div className="flex items-center gap-2 bg-white p-4 rounded-2xl border border-neutral-200">
                          <p className="flex-1 font-mono text-xs break-all text-neutral-900 font-bold">
                            {store.pixKey || 'Chave Pix não configurada'}
                          </p>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(store.pixKey || '');
                              toast.success('Chave Pix copiada!');
                            }}
                            className="p-2 hover:bg-neutral-50 rounded-lg transition-colors text-neutral-400 hover:text-neutral-900"
                          >
                            <QrCode size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 justify-center text-neutral-400">
                      <div className="h-px flex-1 bg-neutral-100"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Importante</span>
                      <div className="h-px flex-1 bg-neutral-100"></div>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed px-4">
                      Após realizar o Pix, clique no botão abaixo para finalizar seu pedido e enviar o comprovante automaticamente pelo WhatsApp.
                    </p>
                  </div>
                )}

                {checkoutStep === 'success' && (
                  <div className="text-center py-20">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-100" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                      <CheckCircle2 size={48} strokeWidth={3} />
                    </div>
                    <h3 className="text-3xl font-black text-neutral-900 mb-4 tracking-tight">Pedido Enviado! 🚀</h3>
                    <p className="text-neutral-500 mb-10 leading-relaxed px-6">
                      Seu pedido foi registrado com sucesso. Estamos te redirecionando para o WhatsApp para finalizar os detalhes da entrega.
                    </p>
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-neutral-900 text-white rounded-2xl font-bold animate-pulse">
                      <MessageCircle size={20} />
                      Abrindo WhatsApp...
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-neutral-100 bg-neutral-50/30 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-neutral-400 font-bold text-sm uppercase tracking-widest">Total</span>
                  <span className="text-2xl font-black text-neutral-900">R$ {cartTotal.toFixed(2)}</span>
                </div>
                
                {checkoutStep === 'cart' && cart.length > 0 && (
                  <button 
                    onClick={() => setCheckoutStep('info')}
                    className="w-full text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-neutral-200"
                    style={{ backgroundColor: 'var(--primary)' }}
                  >
                    Finalizar Pedido
                    <ArrowRight size={20} strokeWidth={3} />
                  </button>
                )}

                {checkoutStep === 'info' && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setCheckoutStep('cart')}
                      className="p-5 bg-white border border-neutral-200 rounded-[2rem] text-neutral-400 hover:text-neutral-900 transition-all"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={() => setCheckoutStep('payment')}
                      className="flex-1 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-neutral-200"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      Pagamento
                      <ArrowRight size={20} strokeWidth={3} />
                    </button>
                  </div>
                )}

                {checkoutStep === 'payment' && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setCheckoutStep('info')}
                      className="p-5 bg-white border border-neutral-200 rounded-[2rem] text-neutral-400 hover:text-neutral-900 transition-all"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={handleCheckout}
                      className="flex-1 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-neutral-200"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      Enviar no WhatsApp
                      <MessageCircle size={20} strokeWidth={3} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Cart Button (Mobile) */}
      {cart.length > 0 && !isCartOpen && (
        <motion.button 
          initial={{ y: 100, scale: 0.8 }}
          animate={{ y: 0, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 left-6 right-6 text-white p-5 rounded-[2rem] shadow-2xl z-20 flex items-center justify-between"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
              <ShoppingCart size={20} strokeWidth={3} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Seu Carrinho</p>
              <p className="font-black text-lg leading-none">{cart.reduce((acc, item) => acc + item.quantity, 0)} itens</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/10">
            <span className="font-black text-lg">R$ {cartTotal.toFixed(2)}</span>
            <ArrowRight size={20} strokeWidth={3} />
          </div>
        </motion.button>
      )}
    </div>
  );
}
