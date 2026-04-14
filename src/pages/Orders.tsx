import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, addDoc, where, getDocs } from 'firebase/firestore';
import { ShoppingBag, Search, Filter, MessageCircle, CheckCircle2, XCircle, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface OrdersProps {
  storeId: string | null;
}

export default function Orders({ storeId }: OrdersProps) {
  const [store, setStore] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch store data
    const unsubscribeStore = onSnapshot(doc(db, 'stores', storeId), (snapshot) => {
      setStore(snapshot.data());
    });

    const q = query(collection(db, 'stores', storeId, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `stores/${storeId}/orders`));

    return () => {
      unsubscribeStore();
      unsubscribeOrders();
    };
  }, [storeId]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    if (!storeId) return;
    try {
      await updateDoc(doc(db, 'stores', storeId, 'orders', orderId), { status: newStatus });
      
      if (newStatus === 'confirmed') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          // 1. Add to Finance
          await addDoc(collection(db, 'stores', storeId, 'finance'), {
            type: 'income',
            amount: order.total,
            category: 'Venda',
            description: `Pedido #${orderId.slice(-4)} - ${order.customerName}`,
            date: new Date().toISOString()
          });

          // 2. Update CRM
          const qCustomer = query(
            collection(db, 'stores', storeId, 'customers'), 
            where('whatsapp', '==', order.customerWhatsapp)
          );
          const customerSnapshot = await getDocs(qCustomer);

          if (customerSnapshot.empty) {
            await addDoc(collection(db, 'stores', storeId, 'customers'), {
              name: order.customerName,
              whatsapp: order.customerWhatsapp,
              birthday: order.customerBirthday || '',
              totalSpent: order.total,
              lastPurchaseAt: new Date().toISOString(),
              ordersCount: 1,
              createdAt: new Date().toISOString()
            });
          } else {
            const customerDoc = customerSnapshot.docs[0];
            const customerData = customerDoc.data();
            await updateDoc(doc(db, 'stores', storeId, 'customers', customerDoc.id), {
              totalSpent: (customerData.totalSpent || 0) + order.total,
              lastPurchaseAt: new Date().toISOString(),
              ordersCount: (customerData.ordersCount || 0) + 1
            });
          }
        }
      }
      
      toast.success(`Pedido ${newStatus === 'confirmed' ? 'confirmado' : 'cancelado'}!`);
      setSelectedOrder(null);
    } catch (error) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         o.customerWhatsapp.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle2 size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <Layout storeName={store?.name} primaryColor={store?.primaryColor}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Pedidos</h1>
            <p className="text-neutral-500">Acompanhe e gerencie as vendas da sua loja.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-900 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-900 appearance-none transition-all font-medium text-neutral-600"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="confirmed">Confirmados</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
          <div className="bg-white px-4 py-3 border border-neutral-200 rounded-xl flex items-center justify-between">
            <span className="text-sm text-neutral-500 font-medium">Total:</span>
            <span className="font-bold text-neutral-900">{filteredOrders.length} pedidos</span>
          </div>
        </div>

        {/* Orders Table/List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-neutral-400" size={40} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-neutral-200 p-20 text-center">
            <ShoppingBag className="mx-auto text-neutral-200 mb-4" size={64} />
            <h3 className="text-lg font-bold text-neutral-900">Nenhum pedido encontrado</h3>
            <p className="text-neutral-500">Seus pedidos aparecerão aqui assim que os clientes comprarem pelo link.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-neutral-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-100">
                    <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Data</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Total</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold text-sm">
                            {order.customerName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900">{order.customerName}</p>
                            <p className="text-xs text-neutral-500">{order.customerWhatsapp}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 font-bold text-neutral-900">
                        R$ {order.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                          getStatusColor(order.status)
                        )}>
                          {getStatusIcon(order.status)}
                          {order.status === 'pending' ? 'Pendente' : order.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded-lg transition-all"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        <AnimatePresence>
          {selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedOrder(null)}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
              >
                <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900">Detalhes do Pedido</h2>
                    <p className="text-xs text-neutral-400 font-mono mt-1 uppercase">ID: {selectedOrder.id}</p>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                    <XCircle size={24} className="text-neutral-400" />
                  </button>
                </div>
                
                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Customer Info */}
                  <div className="flex items-center justify-between bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                    <div>
                      <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mb-1">Cliente</p>
                      <p className="font-bold text-neutral-900">{selectedOrder.customerName}</p>
                      <p className="text-sm text-neutral-500">{selectedOrder.customerWhatsapp}</p>
                    </div>
                    <a 
                      href={`https://wa.me/${selectedOrder.customerWhatsapp}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-100"
                    >
                      <MessageCircle size={20} />
                    </a>
                  </div>

                  {/* Items List */}
                  <div>
                    <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mb-4">Itens do Pedido</p>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-neutral-100 rounded flex items-center justify-center text-xs font-bold text-neutral-600">
                              {item.quantity}x
                            </span>
                            <span className="font-medium text-neutral-900">{item.name}</span>
                          </div>
                          <span className="font-bold text-neutral-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="pt-4 border-t border-neutral-100">
                    <div className="flex items-center justify-between text-lg font-bold text-neutral-900">
                      <span>Total</span>
                      <span>R$ {selectedOrder.total.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">Pagamento via: {selectedOrder.paymentMethod === 'pix' ? 'Pix' : 'Cartão'}</p>
                  </div>
                </div>

                <div className="p-8 bg-neutral-50 border-t border-neutral-100 flex gap-3">
                  {selectedOrder.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => updateStatus(selectedOrder.id, 'cancelled')}
                        className="flex-1 px-6 py-4 rounded-2xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => updateStatus(selectedOrder.id, 'confirmed')}
                        className="flex-[2] bg-neutral-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={20} />
                        Confirmar Pedido
                      </button>
                    </>
                  )}
                  {selectedOrder.status !== 'pending' && (
                    <button 
                      onClick={() => setSelectedOrder(null)}
                      className="w-full px-6 py-4 rounded-2xl bg-neutral-900 text-white font-bold hover:bg-neutral-800 transition-all"
                    >
                      Fechar
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
