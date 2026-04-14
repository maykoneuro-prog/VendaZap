import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { db, OperationType, handleFirestoreError, storage } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Plus, Search, Edit2, Trash2, Package, Image as ImageIcon, Loader2, X, Camera, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ProductsProps {
  storeId: string | null;
}

export default function Products({ storeId }: ProductsProps) {
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    costPrice: '',
    stock: '',
    category: '',
    imageUrl: '',
    isActive: true
  });

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

    const q = query(collection(db, 'stores', storeId, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `stores/${storeId}/products`));

    return () => {
      unsubscribeStore();
      unsubscribeProducts();
    };
  }, [storeId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storeId) return;

    // Limit file size to 3MB
    if (file.size > 3 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 3MB.');
      return;
    }

    setUploading(true);
    console.log('Iniciando upload da imagem do produto...', file.name, file.size);

    // Fallback para Base64 se for uma imagem pequena
    if (file.size < 100 * 1024) { // Menor que 100kb
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, imageUrl: base64String }));
        setUploading(false);
        toast.success('Imagem carregada com sucesso (Otimizada)!');
      };
      reader.onerror = () => {
        setUploading(false);
        toast.error('Erro ao processar imagem.');
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      const storageRef = ref(storage, `stores/${storeId}/products/${Date.now()}-${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Timeout de 60 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 60000)
      );

      const uploadPromise = new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload progress: ' + progress + '%');
          }, 
          (error) => reject(error), 
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      const url = await Promise.race([uploadPromise, timeoutPromise]) as string;
      setFormData(prev => ({ ...prev, imageUrl: url }));
      toast.success('Imagem carregada com sucesso!');
    } catch (error: any) {
      console.error('Erro no upload da imagem:', error);
      if (error.message === 'timeout') {
        toast.error('O upload demorou muito. Tente uma imagem menor.');
      } else if (error.code === 'storage/unauthorized') {
        toast.error('Sem permissão para salvar no servidor.');
      } else {
        toast.error('Erro ao carregar imagem.');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setSubmitting(true);

    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        costPrice: parseFloat(formData.costPrice || '0'),
        stock: parseInt(formData.stock),
        updatedAt: new Date().toISOString()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'stores', storeId, 'products', editingProduct.id), data);
        toast.success('Produto atualizado!');
      } else {
        await addDoc(collection(db, 'stores', storeId, 'products'), {
          ...data,
          createdAt: new Date().toISOString()
        });
        toast.success('Produto adicionado!');
      }
      closeModal();
    } catch (error) {
      toast.error('Erro ao salvar produto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!storeId || !window.confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await deleteDoc(doc(db, 'stores', storeId, 'products', id));
      toast.success('Produto excluído.');
    } catch (error) {
      toast.error('Erro ao excluir produto.');
    }
  };

  const openModal = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        costPrice: (product.costPrice || 0).toString(),
        stock: product.stock.toString(),
        category: product.category || '',
        imageUrl: product.imageUrl || '',
        isActive: product.isActive ?? true
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', costPrice: '', stock: '', category: '', imageUrl: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout storeName={store?.name} primaryColor={store?.primaryColor}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Produtos</h1>
            <p className="text-neutral-500">Gerencie seu catálogo de produtos.</p>
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-neutral-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-neutral-200"
          >
            <Plus size={20} />
            Novo Produto
          </button>
        </div>

        {/* Search & Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-3 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-900 transition-all"
            />
          </div>
          <div className="bg-white px-4 py-3 border border-neutral-200 rounded-xl flex items-center justify-between">
            <span className="text-sm text-neutral-500 font-medium">Total:</span>
            <span className="font-bold text-neutral-900">{products.length} itens</span>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-neutral-400" size={40} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-neutral-200 p-20 text-center">
            <Package className="mx-auto text-neutral-200 mb-4" size={64} />
            <h3 className="text-lg font-bold text-neutral-900">Nenhum produto encontrado</h3>
            <p className="text-neutral-500 mb-6">Comece adicionando seu primeiro produto ao catálogo.</p>
            <button onClick={() => openModal()} className="text-neutral-900 font-bold hover:underline">Adicionar Produto</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <motion.div 
                key={product.id}
                layout
                className="bg-white rounded-3xl border border-neutral-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="aspect-square bg-neutral-100 relative">
                  <img 
                    src={product.imageUrl || `https://picsum.photos/seed/${product.id}/400/400`} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(product)} className="p-2 bg-white rounded-lg shadow-lg text-neutral-600 hover:text-neutral-900">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 bg-white rounded-lg shadow-lg text-red-500 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {product.stock <= 5 && (
                    <div className="absolute bottom-3 left-3 px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">
                      Estoque Baixo
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{product.category || 'Sem Categoria'}</span>
                    <div className={`w-2 h-2 rounded-full ${product.isActive ? 'bg-green-500' : 'bg-neutral-300'}`}></div>
                  </div>
                  <h3 className="font-bold text-neutral-900 mb-2 truncate">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-neutral-900">R$ {product.price.toFixed(2)}</p>
                    <p className="text-xs text-neutral-500 font-medium">{product.stock} em estoque</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeModal}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
              >
                <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-neutral-900">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                  <button onClick={closeModal} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                    <X size={24} className="text-neutral-400" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Image Upload Section */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Foto do Produto</label>
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-full aspect-video bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200 flex items-center justify-center overflow-hidden relative group">
                        {formData.imageUrl ? (
                          <>
                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 bg-white rounded-full text-neutral-900 hover:scale-110 transition-transform"
                              >
                                <Camera size={20} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-6">
                            {uploading ? (
                              <Loader2 className="animate-spin text-neutral-400 mx-auto mb-2" size={32} />
                            ) : (
                              <ImageIcon className="text-neutral-200 mx-auto mb-2" size={48} />
                            )}
                            <p className="text-sm text-neutral-400">Tire uma foto ou escolha um arquivo</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 w-full">
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-100 rounded-xl text-sm font-bold text-neutral-700 hover:bg-neutral-200 transition-all"
                        >
                          <Upload size={18} />
                          Escolher Foto
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.setAttribute('capture', 'environment');
                              fileInputRef.current.click();
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-900 rounded-xl text-sm font-bold text-white hover:bg-neutral-800 transition-all"
                        >
                          <Camera size={18} />
                          Tirar Foto
                        </button>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-neutral-700 mb-1">Nome do Produto</label>
                      <input 
                        type="text" required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                        placeholder="Ex: Camiseta Algodão Premium"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-neutral-700 mb-1">Descrição</label>
                      <textarea 
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900 h-24 resize-none"
                        placeholder="Fale um pouco sobre o produto..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-1">Preço de Custo (R$)</label>
                      <input 
                        type="number" step="0.01"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-1">Preço de Venda (R$)</label>
                      <input 
                        type="number" step="0.01" required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-1">Estoque</label>
                      <input 
                        type="number" required
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-neutral-700 mb-1">Categoria</label>
                      <input 
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                        placeholder="Ex: Roupas"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-neutral-700">Produto Ativo (visível no catálogo)</label>
                  </div>
                </form>
                <div className="p-8 bg-neutral-50 border-t border-neutral-100 flex gap-4">
                  <button 
                    onClick={closeModal}
                    className="flex-1 px-6 py-4 rounded-2xl border border-neutral-200 font-bold hover:bg-neutral-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={submitting || uploading}
                    className="flex-[2] bg-neutral-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : (editingProduct ? 'Salvar Alterações' : 'Criar Produto')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

