import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign,
  Loader2,
  X,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

interface FinanceProps {
  storeId: string | null;
}

export default function Finance({ storeId }: FinanceProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ type: 'expense', amount: '', category: '', description: '' });

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'stores', storeId, 'finance'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `stores/${storeId}/finance`));

    return () => unsubscribe();
  }, [storeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setSubmitting(true);

    try {
      await addDoc(collection(db, 'stores', storeId, 'finance'), {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date().toISOString()
      });
      toast.success('Registro financeiro adicionado!');
      setIsModalOpen(false);
      setFormData({ type: 'expense', amount: '', category: '', description: '' });
    } catch (error) {
      toast.error('Erro ao salvar registro.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalIncome = records.filter(r => r.type === 'income').reduce((acc, r) => acc + r.amount, 0);
  const totalExpense = records.filter(r => r.type === 'expense').reduce((acc, r) => acc + r.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const chartData = [
    { name: 'Entradas', value: totalIncome, color: '#10b981' },
    { name: 'Saídas', value: totalExpense, color: '#ef4444' },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Financeiro</h1>
            <p className="text-neutral-500">Controle seu fluxo de caixa e lucratividade.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-neutral-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-neutral-200"
          >
            <Plus size={20} />
            Novo Registro
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-2xl text-green-600">
                <TrendingUp size={24} />
              </div>
              <ArrowUpRight className="text-green-500" size={20} />
            </div>
            <p className="text-sm font-medium text-neutral-500 mb-1">Total de Entradas</p>
            <p className="text-3xl font-bold text-neutral-900">R$ {totalIncome.toFixed(2)}</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                <TrendingDown size={24} />
              </div>
              <ArrowDownRight className="text-red-500" size={20} />
            </div>
            <p className="text-sm font-medium text-neutral-500 mb-1">Total de Saídas</p>
            <p className="text-3xl font-bold text-neutral-900">R$ {totalExpense.toFixed(2)}</p>
          </div>

          <div className="bg-neutral-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-neutral-200 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/10 rounded-2xl text-white backdrop-blur-sm">
                  <Wallet size={24} />
                </div>
                <div className="px-2 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest">Lucro Líquido</div>
              </div>
              <p className="text-sm font-medium text-neutral-400 mb-1">Saldo em Caixa</p>
              <p className="text-3xl font-bold">R$ {netProfit.toFixed(2)}</p>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Chart */}
          <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-900 mb-8">Balanço Geral</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#737373' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#737373' }} />
                  <Tooltip cursor={{ fill: '#f5f5f5' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 font-medium">Margem de Lucro</span>
                <span className="font-bold text-neutral-900">{totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-neutral-900 h-full transition-all duration-1000" 
                  style={{ width: `${totalIncome > 0 ? Math.max(0, Math.min(100, (netProfit / totalIncome) * 100)) : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Records List */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-neutral-900">Histórico de Transações</h2>
              <button className="text-sm font-bold text-neutral-400 hover:text-neutral-900 transition-colors">Ver tudo</button>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-neutral-400" size={32} />
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="mx-auto text-neutral-200 mb-2" size={48} />
                  <p className="text-neutral-500 text-sm">Nenhuma transação registrada.</p>
                </div>
              ) : records.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-neutral-50 transition-colors border border-transparent hover:border-neutral-100">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      record.type === 'income' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    )}>
                      {record.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900">{record.description || record.category || 'Sem descrição'}</p>
                      <p className="text-xs text-neutral-500">{format(new Date(record.date), "dd 'de' MMMM", { locale: ptBR })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-bold", record.type === 'income' ? "text-green-600" : "text-red-600")}>
                      {record.type === 'income' ? '+' : '-'} R$ {record.amount.toFixed(2)}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{record.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden">
                <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-neutral-900">Novo Registro</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                    <X size={24} className="text-neutral-400" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-4">
                  <div className="flex p-1 bg-neutral-100 rounded-xl mb-4">
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'income' })}
                      className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", formData.type === 'income' ? "bg-white text-green-600 shadow-sm" : "text-neutral-500")}
                    >
                      Entrada
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'expense' })}
                      className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", formData.type === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-neutral-500")}
                    >
                      Saída
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1">Valor (R$)</label>
                    <input 
                      type="number" step="0.01" required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1">Categoria</label>
                    <select 
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="Venda">Venda</option>
                      <option value="Reposição">Reposição de Estoque</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Infraestrutura">Infraestrutura</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1">Descrição</label>
                    <input 
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-neutral-200 font-bold hover:bg-neutral-100 transition-all">Cancelar</button>
                    <button type="submit" disabled={submitting} className="flex-[2] bg-neutral-900 text-white py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                      {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Salvar'}
                    </button>
                  </div>
                </form>
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
