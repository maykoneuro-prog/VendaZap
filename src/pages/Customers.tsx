import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { doc, onSnapshot, query, orderBy, collection } from 'firebase/firestore';
import { Users, Search, MessageCircle, Cake, Calendar, DollarSign, Loader2, ChevronRight, CheckSquare, Square, Send } from 'lucide-react';
import { format, isSameDay, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CustomersProps {
  storeId: string | null;
}

export default function Customers({ storeId }: CustomersProps) {
  const [store, setStore] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Fetch store data for instagram info
    const unsubscribeStore = onSnapshot(doc(db, 'stores', storeId), (snapshot) => {
      setStore(snapshot.data());
    });

    const q = query(collection(db, 'stores', storeId, 'customers'), orderBy('name'));
    const unsubscribeCustomers = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `stores/${storeId}/customers`));

    return () => {
      unsubscribeStore();
      unsubscribeCustomers();
    };
  }, [storeId]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.whatsapp.includes(searchTerm)
  );

  const birthdaysToday = customers.filter(c => {
    if (!c.birthday) return false;
    const bday = new Date(c.birthday);
    const today = new Date();
    return bday.getDate() === today.getDate() && bday.getMonth() === today.getMonth();
  });

  const toggleCustomer = (id: string) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectTodayPurchases = () => {
    const todayIds = customers
      .filter(c => c.lastPurchaseAt && isToday(new Date(c.lastPurchaseAt)))
      .map(c => c.id);
    setSelectedCustomers(todayIds);
  };

  const sendFeedbackMessages = () => {
    if (selectedCustomers.length === 0) return;

    selectedCustomers.forEach((id, index) => {
      const customer = customers.find(c => c.id === id);
      if (!customer) return;

      const instagram = store?.instagram ? `\n\nAproveita e segue a gente no Instagram: @${store.instagram}. Se postar uma foto, marca a gente que vamos adorar repostar! 📸✨` : '';
      
      const message = `Olá, ${customer.name}! Tudo bem? 😊\n\nPassando para agradecer a sua compra hoje na *${store?.name || 'nossa loja'}*! \n\nO que você achou do seu pedido? Seu feedback é super importante para nós! ❤️${instagram}`;
      
      const whatsappUrl = `https://wa.me/${customer.whatsapp}?text=${encodeURIComponent(message)}`;
      
      // Open with delay to avoid browser blocking multiple popups
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, index * 1000);
    });
    
    setSelectedCustomers([]);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Clientes</h1>
            <p className="text-neutral-500">Sua base de clientes e CRM leve.</p>
          </div>
        </div>

        {/* Birthday Alert */}
        {birthdaysToday.length > 0 && (
          <div className="bg-neutral-900 rounded-[2rem] p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Cake className="text-white" size={20} />
                </div>
                <h2 className="text-xl font-bold">Aniversariantes de Hoje!</h2>
              </div>
              <p className="text-neutral-400 text-sm">
                {birthdaysToday.length === 1 
                  ? `${birthdaysToday[0].name} faz aniversário hoje. Que tal enviar um cupom?`
                  : `${birthdaysToday.length} clientes fazem aniversário hoje. Aproveite para prospectar!`
                }
              </p>
            </div>
            <div className="flex -space-x-3 relative z-10">
              {birthdaysToday.slice(0, 5).map((c, i) => (
                <div key={i} className="w-12 h-12 rounded-full bg-neutral-800 border-2 border-neutral-900 flex items-center justify-center font-bold text-sm">
                  {c.name.charAt(0)}
                </div>
              ))}
              {birthdaysToday.length > 5 && (
                <div className="w-12 h-12 rounded-full bg-neutral-700 border-2 border-neutral-900 flex items-center justify-center font-bold text-xs">
                  +{birthdaysToday.length - 5}
                </div>
              )}
            </div>
            {/* Decorative background circle */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          </div>
        )}

        {/* Filters & Stats */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-900 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={selectTodayPurchases}
              className="px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-600 hover:bg-neutral-50 transition-all flex items-center gap-2"
            >
              <CheckSquare size={18} />
              Vendas de Hoje
            </button>
            {selectedCustomers.length > 0 && (
              <button 
                onClick={sendFeedbackMessages}
                className="px-6 py-3 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg shadow-neutral-200"
              >
                <Send size={18} />
                Enviar Feedback ({selectedCustomers.length})
              </button>
            )}
          </div>
        </div>

        {/* Customers Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-neutral-400" size={40} />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-neutral-200 p-20 text-center">
            <Users className="mx-auto text-neutral-200 mb-4" size={64} />
            <h3 className="text-lg font-bold text-neutral-900">Nenhum cliente ainda</h3>
            <p className="text-neutral-500">Os clientes são cadastrados automaticamente ao realizarem um pedido.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer) => (
              <div 
                key={customer.id} 
                onClick={() => toggleCustomer(customer.id)}
                className={`bg-white rounded-[2rem] border p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer relative ${selectedCustomers.includes(customer.id) ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-100'}`}
              >
                {selectedCustomers.includes(customer.id) && (
                  <div className="absolute top-4 right-4 text-neutral-900">
                    <CheckSquare size={20} />
                  </div>
                )}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold text-xl">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900">{customer.name}</h3>
                      <p className="text-sm text-neutral-500">{customer.whatsapp}</p>
                    </div>
                  </div>
                  <a 
                    href={`https://wa.me/${customer.whatsapp}`} 
                    target="_blank" 
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-3 bg-neutral-50 text-neutral-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                  >
                    <MessageCircle size={20} />
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                      <DollarSign size={12} />
                      Total Gasto
                    </div>
                    <p className="font-bold text-neutral-900">R$ {(customer.totalSpent || 0).toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                      <Calendar size={12} />
                      Última Compra
                    </div>
                    <p className="font-bold text-neutral-900 text-sm">
                      {customer.lastPurchaseAt ? format(new Date(customer.lastPurchaseAt), "dd/MM/yy") : 'N/A'}
                    </p>
                  </div>
                  {customer.birthday && (
                    <div className="col-span-2 pt-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-100">
                        <Cake size={14} className="text-neutral-400" />
                        <span className="text-xs font-medium text-neutral-600">
                          Aniversário: {format(new Date(customer.birthday), "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
