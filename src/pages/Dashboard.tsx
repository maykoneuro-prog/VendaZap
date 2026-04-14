import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db, OperationType, handleFirestoreError, auth } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DashboardProps {
  storeId: string | null;
}

export default function Dashboard({ storeId }: DashboardProps) {
  const [store, setStore] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalOrders: 0,
    totalCustomers: 0,
    lowStock: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Fetch store data
    const unsubscribeStore = onSnapshot(doc(db, 'stores', storeId), (snapshot) => {
      setStore(snapshot.data());
    }, (error) => handleFirestoreError(error, OperationType.GET, `stores/${storeId}`));

    // Fetch recent orders
    const qOrders = query(
      collection(db, 'stores', storeId, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
      
      // Calculate stats (simplified for demo)
      const totalSales = ordersData.reduce((acc, order: any) => acc + (order.total || 0), 0);
      
      // Calculate profit from all orders (not just the last 5 for stats)
      // Actually, for real stats we should listen to all orders or use a separate query
    }, (error) => handleFirestoreError(error, OperationType.LIST, `stores/${storeId}/orders`));

    // Listen to all orders for stats
    const qAllOrders = query(collection(db, 'stores', storeId, 'orders'));
    const unsubscribeAllOrders = onSnapshot(qAllOrders, (snapshot) => {
      let totalSales = 0;
      let totalProfit = 0;
      let confirmedOrdersCount = 0;
      
      snapshot.docs.forEach(doc => {
        const order = doc.data();
        
        // Only count confirmed orders for sales and profit
        if (order.status === 'confirmed') {
          totalSales += order.total || 0;
          confirmedOrdersCount++;
          
          // Calculate profit for this order
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const itemProfit = (item.price - (item.costPrice || 0)) * item.quantity;
              totalProfit += itemProfit;
            });
          }
        }
      });
      
      setStats(prev => ({ 
        ...prev, 
        totalSales, 
        totalProfit,
        totalOrders: confirmedOrdersCount 
      }));
    });

    // Fetch low stock products
    const qProducts = query(collection(db, 'stores', storeId, 'products'));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const lowStockCount = snapshot.docs.filter(doc => doc.data().stock <= 5).length;
      setStats(prev => ({ ...prev, lowStock: lowStockCount }));
    });

    // Fetch total customers
    const qCustomers = query(collection(db, 'stores', storeId, 'customers'));
    const unsubscribeCustomers = onSnapshot(qCustomers, (snapshot) => {
      setStats(prev => ({ ...prev, totalCustomers: snapshot.size }));
    });

    // Fetch Platform Settings for Pix Key
    const unsubscribePlatform = onSnapshot(doc(db, 'platform', 'settings'), (snapshot) => {
      if (snapshot.exists()) {
        setPlatformSettings(snapshot.data());
      }
    });

    setLoading(false);

    return () => {
      unsubscribeStore();
      unsubscribeOrders();
      unsubscribeAllOrders();
      unsubscribeProducts();
      unsubscribeCustomers();
      unsubscribePlatform();
    };
  }, [storeId]);

  const chartData = [
    { name: 'Seg', sales: 400, profit: 120 },
    { name: 'Ter', sales: 300, profit: 90 },
    { name: 'Qua', sales: 600, profit: 180 },
    { name: 'Qui', sales: 800, profit: 240 },
    { name: 'Sex', sales: 500, profit: 150 },
    { name: 'Sáb', sales: 900, profit: 270 },
    { name: 'Dom', sales: 700, profit: 210 },
  ];

  if (loading) {
    return (
      <Layout storeName="Carregando..." primaryColor="#000000">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="animate-spin text-neutral-900" size={40} />
        </div>
      </Layout>
    );
  }

  if (!storeId) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
          <AlertCircle className="text-red-500 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Loja não encontrada</h2>
          <p className="text-neutral-500 mb-6">Não conseguimos encontrar as configurações da sua loja. Tente sair e entrar novamente.</p>
          <button 
            onClick={() => auth.signOut()}
            className="bg-neutral-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-neutral-800 transition-all"
          >
            Sair da conta
          </button>
        </div>
      </Layout>
    );
  }

  const getTrialDaysRemaining = () => {
    if (!store?.createdAt) return 0;
    const createdDate = parseISO(store.createdAt);
    const trialEndDate = addDays(createdDate, 7);
    const diff = trialEndDate.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = store?.subscriptionStatus === 'active' 
    ? (store.subscriptionExpiresAt ? Math.max(0, Math.ceil((parseISO(store.subscriptionExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 999)
    : getTrialDaysRemaining();

  const isExpiringSoon = daysRemaining <= 3;

  return (
    <Layout storeName={store?.name || 'Dashboard'} primaryColor={store?.primaryColor || '#000000'}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Subscription Alert */}
        {isExpiringSoon && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="font-bold text-amber-900">Sua assinatura vence em {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}!</h3>
                <p className="text-sm text-amber-700">Para continuar usando o VendaZap, realize o pagamento via Pix.</p>
              </div>
            </div>
            {platformSettings?.adminPixKey && (
              <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col items-center md:items-end">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Chave Pix para Renovação</p>
                <p className="font-mono font-bold text-neutral-900 select-all">{platformSettings.adminPixKey}</p>
                <p className="text-[10px] text-neutral-400 mt-1">Valor: R$ {platformSettings.subscriptionPrice || '29,90'}</p>
              </div>
            )}
          </motion.div>
        )}
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Olá, {store?.name || 'Lojista'}!</h1>
            <p className="text-neutral-500">Aqui está o resumo das suas vendas hoje.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-600 flex items-center gap-2">
              <Clock size={16} />
              {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
            </div>
            <button 
              className="text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
              style={{ backgroundColor: store?.primaryColor || '#171717' }}
            >
              Novo Produto
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            { label: 'Vendas Totais', value: `R$ ${stats.totalSales.toFixed(2)}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', trend: '+12%' },
            { label: 'Lucro Real', value: `R$ ${stats.totalProfit.toFixed(2)}`, icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: 'Líquido' },
            { label: 'Pedidos', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+5%' },
            { label: 'Clientes', value: stats.totalCustomers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', trend: '+8%' },
            { label: 'Estoque Baixo', value: stats.lowStock, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', trend: 'Atenção' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-xl", stat.bg)}>
                  <stat.icon className={stat.color} size={24} />
                </div>
                <span className={cn("text-xs font-bold px-2 py-1 rounded-full", 
                  stat.trend.includes('+') ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {stat.trend}
                </span>
              </div>
              <p className="text-sm font-medium text-neutral-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts & Recent Activity */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sales Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-neutral-900">Desempenho de Vendas</h2>
              <select className="bg-neutral-50 border-none text-sm font-medium rounded-lg px-3 py-1 outline-none">
                <option>Últimos 7 dias</option>
                <option>Último mês</option>
              </select>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={store?.primaryColor || "#171717"} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={store?.primaryColor || "#171717"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#737373' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#737373' }} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke={store?.primaryColor || "#171717"} 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-900 mb-6">Últimos Pedidos</h2>
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="mx-auto text-neutral-200 mb-2" size={48} />
                  <p className="text-neutral-500 text-sm">Nenhum pedido ainda.</p>
                </div>
              ) : orders.map((order, i) => (
                <div key={order.id} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold text-xs">
                      {order.customerName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900 group-hover:underline">{order.customerName}</p>
                      <p className="text-xs text-neutral-500">{format(new Date(order.createdAt), "HH:mm '•' dd/MM")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-neutral-900">R$ {order.total.toFixed(2)}</p>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {orders.length > 0 && (
              <button className="w-full mt-8 py-3 text-sm font-bold text-neutral-600 hover:text-neutral-900 transition-colors border-t border-neutral-50">
                Ver todos os pedidos
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
