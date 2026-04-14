import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { 
  Users, 
  Store, 
  Calendar, 
  CreditCard, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  ArrowRight,
  ShieldCheck,
  X,
  ChevronRight,
  Settings as SettingsIcon,
  Megaphone,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '../components/Layout';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PLATFORM_OWNER_EMAIL = 'maykon.euro@gmail.com';

export default function SuperAdmin() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'trial' | 'active' | 'expired' | 'expiring'>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'stores' | 'settings' | 'ads'>('stores');
  
  const [globalSettings, setGlobalSettings] = useState({
    adminPixKey: '',
    subscriptionPrice: '29.90',
    adBannerUrl: '',
    adLink: '',
    showAdsOnStorefront: false
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (user?.email === PLATFORM_OWNER_EMAIL) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Fetch Stores
    const q = query(collection(db, 'stores'), orderBy('createdAt', 'desc'));
    const unsubscribeStores = onSnapshot(q, (snapshot) => {
      setStores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Fetch Global Settings
    const unsubscribeSettings = onSnapshot(doc(db, 'platform', 'settings'), (snapshot) => {
      if (snapshot.exists()) {
        setGlobalSettings(snapshot.data() as any);
      }
    });

    return () => {
      unsubscribeStores();
      unsubscribeSettings();
    };
  }, []);

  const saveGlobalSettings = async () => {
    try {
      await updateDoc(doc(db, 'platform', 'settings'), {
        ...globalSettings,
        updatedAt: new Date().toISOString()
      });
      toast.success('Configurações globais salvas!');
    } catch (error) {
      // If document doesn't exist, we might need to set it first
      try {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'platform', 'settings'), {
          ...globalSettings,
          updatedAt: new Date().toISOString()
        });
        toast.success('Configurações globais criadas!');
      } catch (err) {
        toast.error('Erro ao salvar configurações globais.');
      }
    }
  };

  const updateSubscription = async (storeId: string, days: number) => {
    try {
      const expirationDate = addDays(new Date(), days).toISOString();
      await updateDoc(doc(db, 'stores', storeId), {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expirationDate,
        updatedAt: new Date().toISOString()
      });
      toast.success(`Assinatura ativada por ${days} dias!`);
      setIsModalOpen(false);
      setSelectedStore(null);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar assinatura. Verifique as permissões.');
    }
  };

  const suspendSubscription = async (storeId: string) => {
    try {
      await updateDoc(doc(db, 'stores', storeId), {
        subscriptionStatus: 'expired',
        updatedAt: new Date().toISOString()
      });
      toast.success('Assinatura suspensa!');
    } catch (error) {
      toast.error('Erro ao suspender assinatura.');
    }
  };

  const getTrialStatus = (store: any) => {
    if (store.subscriptionStatus === 'active') {
      const expiresAt = store.subscriptionExpiresAt ? parseISO(store.subscriptionExpiresAt) : null;
      if (expiresAt) {
        const daysRemaining = differenceInDays(expiresAt, new Date());
        if (daysRemaining <= 0) return { label: 'Assinatura Expirada', color: 'text-red-600 bg-red-50', icon: <AlertCircle size={14} />, days: 0 };
        return { label: `Ativo (${daysRemaining} dias)`, color: 'text-green-600 bg-green-50', icon: <CheckCircle2 size={14} />, days: daysRemaining };
      }
      return { label: 'Ativo', color: 'text-green-600 bg-green-50', icon: <CheckCircle2 size={14} />, days: 999 };
    }
    
    const createdDate = parseISO(store.createdAt);
    const daysSinceCreation = differenceInDays(new Date(), createdDate);
    const daysRemaining = 7 - daysSinceCreation;

    if (daysRemaining <= 0) {
      return { label: 'Teste Expirado', color: 'text-red-600 bg-red-50', icon: <AlertCircle size={14} />, days: 0 };
    }
    return { label: `Teste (${daysRemaining}/7 dias)`, color: 'text-blue-600 bg-blue-50', icon: <Clock size={14} />, days: daysRemaining };
  };

  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         store.whatsapp.includes(searchTerm);
    
    const status = getTrialStatus(store);
    const matchesFilter = filter === 'all' || 
                         (filter === 'trial' && status.label.includes('Teste')) ||
                         (filter === 'active' && store.subscriptionStatus === 'active' && status.days > 0) ||
                         (filter === 'expired' && (status.label === 'Teste Expirado' || status.label === 'Assinatura Expirada')) ||
                         (filter === 'expiring' && status.days > 0 && status.days <= 3);

    return matchesSearch && matchesFilter;
  });

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6 text-center">
        <ShieldCheck size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Acesso Restrito</h1>
        <p className="text-neutral-500 mb-6">Esta área é exclusiva para o administrador global da plataforma.</p>
        <a href="/" className="bg-neutral-900 text-white px-8 py-3 rounded-xl font-bold">Voltar ao Início</a>
      </div>
    );
  }

  return (
    <Layout storeName="Painel Global">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Gestão Global 🌍</h1>
            <p className="text-neutral-500">Administre lojas, pagamentos e anúncios.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('stores')}
              className={cn(
                "px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2",
                activeTab === 'stores' ? "bg-neutral-900 text-white shadow-lg" : "bg-white text-neutral-500 hover:bg-neutral-50"
              )}
            >
              <Store size={18} />
              Lojas
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn(
                "px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2",
                activeTab === 'settings' ? "bg-neutral-900 text-white shadow-lg" : "bg-white text-neutral-500 hover:bg-neutral-50"
              )}
            >
              <SettingsIcon size={18} />
              Financeiro
            </button>
            <button 
              onClick={() => setActiveTab('ads')}
              className={cn(
                "px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2",
                activeTab === 'ads' ? "bg-neutral-900 text-white shadow-lg" : "bg-white text-neutral-500 hover:bg-neutral-50"
              )}
            >
              <Megaphone size={18} />
              Anúncios
            </button>
          </div>
        </div>

        {activeTab === 'stores' && (
          <div className="space-y-8">
            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-neutral-200 rounded-2xl outline-none focus:ring-2 focus:ring-neutral-900 shadow-sm"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                {(['all', 'trial', 'expiring', 'active', 'expired'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-6 py-4 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border ${
                      filter === f 
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-lg' 
                        : 'bg-white text-neutral-500 border-neutral-100 hover:border-neutral-200'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'trial' ? 'Em Teste' : f === 'expiring' ? 'Próx. Vencimento' : f === 'active' ? 'Ativos' : 'Expirados'}
                  </button>
                ))}
              </div>
            </div>

            {/* Stores List */}
            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                <div className="text-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto"></div>
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-neutral-100">
                  <Users className="mx-auto text-neutral-100 mb-4" size={80} />
                  <h3 className="text-xl font-bold text-neutral-900">Nenhuma loja encontrada</h3>
                </div>
              ) : filteredStores.map((store) => {
                const status = getTrialStatus(store);
                return (
                  <motion.div 
                    key={store.id}
                    layout
                    className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-6"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {store.logoUrl ? (
                          <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Store className="text-neutral-200" size={32} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-neutral-900 text-lg">{store.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                          <Calendar size={14} />
                          Inscrito em {format(parseISO(store.createdAt), "dd 'de' MMMM", { locale: ptBR })}
                        </div>
                        <p className="text-xs text-neutral-400 font-mono mt-1">{store.whatsapp}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedStore(store);
                            setIsModalOpen(true);
                          }}
                          className="bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-600 transition-all flex items-center gap-2"
                        >
                          <CreditCard size={14} />
                          Ativar/Renovar
                        </button>
                        
                        {store.subscriptionStatus === 'active' && (
                          <button 
                            onClick={() => suspendSubscription(store.id)}
                            className="bg-neutral-100 text-neutral-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-neutral-200 transition-all"
                          >
                            Suspender
                          </button>
                        )}
                        
                        <a 
                          href={`/s/${store.slug}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 bg-neutral-50 text-neutral-400 hover:text-neutral-900 rounded-xl transition-all"
                        >
                          <ArrowRight size={20} />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">Configurações de Pagamento</h2>
                <p className="text-neutral-500">Defina sua chave Pix para receber as assinaturas.</p>
              </div>
              <button 
                onClick={saveGlobalSettings}
                className="bg-neutral-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-neutral-800 transition-all"
              >
                <Save size={18} />
                Salvar
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-neutral-700">Sua Chave Pix (Administrador)</label>
                <input 
                  type="text"
                  value={globalSettings.adminPixKey}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, adminPixKey: e.target.value })}
                  className="w-full px-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="E-mail, CPF ou Chave Aleatória"
                />
                <p className="text-xs text-neutral-400">Esta chave será mostrada aos lojistas quando a assinatura deles estiver vencendo.</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-neutral-700">Valor da Assinatura (R$)</label>
                <input 
                  type="text"
                  value={globalSettings.subscriptionPrice}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, subscriptionPrice: e.target.value })}
                  className="w-full px-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="29.90"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="bg-white p-8 rounded-[3rem] border border-neutral-100 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">Gestão de Anúncios</h2>
                <p className="text-neutral-500">Configure banners publicitários para as lojas.</p>
              </div>
              <button 
                onClick={saveGlobalSettings}
                className="bg-neutral-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-neutral-800 transition-all"
              >
                <Save size={18} />
                Salvar
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <input 
                  type="checkbox"
                  id="showAds"
                  checked={globalSettings.showAdsOnStorefront}
                  onChange={(e) => setGlobalSettings({ ...globalSettings, showAdsOnStorefront: e.target.checked })}
                  className="w-5 h-5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <label htmlFor="showAds" className="font-bold text-neutral-900">Ativar anúncios nos catálogos dos clientes</label>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-neutral-700">URL da Imagem do Banner</label>
                  <input 
                    type="text"
                    value={globalSettings.adBannerUrl}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, adBannerUrl: e.target.value })}
                    className="w-full px-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="https://exemplo.com/banner.jpg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-neutral-700">Link do Anúncio (Opcional)</label>
                  <input 
                    type="text"
                    value={globalSettings.adLink}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, adLink: e.target.value })}
                    className="w-full px-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="https://seu-link.com"
                  />
                </div>
              </div>

              {globalSettings.adBannerUrl && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-neutral-700">Pré-visualização:</p>
                  <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden border border-neutral-200">
                    <img src={globalSettings.adBannerUrl} alt="Preview Ad" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Activation Modal */}
      <AnimatePresence>
        {isModalOpen && selectedStore && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Ativar Assinatura</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                  <X size={24} className="text-neutral-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <p className="text-neutral-500 text-sm mb-4">Selecione o período de ativação para a loja <span className="font-bold text-neutral-900">{selectedStore.name}</span>:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { label: '3 Dias (Cortesia)', days: 3 },
                      { label: '30 Dias (Mensal)', days: 30 },
                      { label: '60 Dias (Bimestral)', days: 60 },
                      { label: '90 Dias (Trimestral)', days: 90 },
                    ].map((period) => (
                      <button
                        key={period.days}
                        onClick={() => updateSubscription(selectedStore.id, period.days)}
                        className="flex items-center justify-between p-4 rounded-2xl border border-neutral-100 hover:border-neutral-900 hover:bg-neutral-50 transition-all group"
                      >
                        <span className="font-bold text-neutral-900">{period.label}</span>
                        <ChevronRight size={18} className="text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
