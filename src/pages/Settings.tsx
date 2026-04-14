import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { db, OperationType, handleFirestoreError, storage } from '../lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  Store, 
  Palette, 
  MessageCircle, 
  CreditCard, 
  ExternalLink, 
  Copy, 
  Check, 
  Loader2,
  Image as ImageIcon,
  Globe,
  Upload,
  Camera,
  Instagram,
  Building2,
  MapPin,
  Hash,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface SettingsProps {
  storeId: string | null;
}

export default function Settings({ storeId }: SettingsProps) {
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    whatsapp: '',
    pixKey: '',
    primaryColor: '#000000',
    logoUrl: '',
    mercadoPagoAccessToken: '',
    instagram: '',
    cnpj: '',
    address: '',
    cep: '',
    openingTime: '08:00',
    closingTime: '18:00'
  });

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, 'stores', storeId), (snapshot) => {
      const data = snapshot.data();
      if (data) {
        setStore(data);
        setFormData({
          name: data.name || '',
          slug: data.slug || '',
          whatsapp: data.whatsapp || '',
          pixKey: data.pixKey || '',
          primaryColor: data.primaryColor || '#000000',
          logoUrl: data.logoUrl || '',
          mercadoPagoAccessToken: data.mercadoPagoAccessToken || '',
          instagram: data.instagram || '',
          cnpj: data.cnpj || '',
          address: data.address || '',
          cep: data.cep || '',
          openingTime: data.openingTime || '08:00',
          closingTime: data.closingTime || '18:00'
        });
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, `stores/${storeId}`));

    return () => unsubscribe();
  }, [storeId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storeId) return;

    // Limit file size to 3MB
    if (file.size > 3 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 3MB.');
      return;
    }

    setUploading(true);
    console.log('Iniciando upload da logo...', file.name, file.size);
    
    // Fallback para Base64 se for uma imagem pequena (como a de 48kb do usuário)
    // Isso garante que funcione mesmo se o Storage estiver com problemas de conexão
    if (file.size < 100 * 1024) { // Menor que 100kb
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, logoUrl: base64String }));
        setUploading(false);
        toast.success('Logo carregada com sucesso (Otimizada)!');
      };
      reader.onerror = () => {
        setUploading(false);
        toast.error('Erro ao processar imagem pequena.');
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      const storageRef = ref(storage, `stores/${storeId}/logo/${Date.now()}-${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Adicionar um timeout de 60 segundos
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
      setFormData(prev => ({ ...prev, logoUrl: url }));
      toast.success('Logo carregada com sucesso!');
    } catch (error: any) {
      console.error('Erro no upload da logo:', error);
      if (error.message === 'timeout') {
        toast.error('O upload demorou muito. Tente uma imagem menor ou verifique sua conexão.');
      } else if (error.code === 'storage/unauthorized') {
        toast.error('Sem permissão para salvar no servidor.');
      } else {
        toast.error('Erro ao carregar logo. Tente novamente.');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setSubmitting(true);

    try {
      await updateDoc(doc(db, 'stores', storeId), {
        ...formData,
        updatedAt: new Date().toISOString()
      });
      toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/s/${formData.slug}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <Layout>
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-neutral-400" size={40} />
      </div>
    </Layout>
  );

  return (
    <Layout storeName={store?.name}>
      <div className="max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Configurações</h1>
          <p className="text-neutral-500">Personalize sua loja e gerencie seus dados.</p>
        </div>

        {/* Store Link Card */}
        <div className="bg-neutral-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <Globe className="text-white" size={20} />
              </div>
              <h2 className="text-xl font-bold">Link da sua Loja</h2>
            </div>
            <p className="text-neutral-400 text-sm mb-6">Compartilhe este link com seus clientes para que eles possam comprar diretamente pelo navegador.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm flex items-center justify-between overflow-hidden">
                <span className="truncate opacity-80">{window.location.origin}/s/{formData.slug}</span>
                <button onClick={copyLink} className="ml-2 p-1 hover:bg-white/10 rounded transition-colors">
                  {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              </div>
              <a 
                href={`/s/${formData.slug}`} 
                target="_blank" 
                rel="noreferrer"
                className="bg-white text-neutral-900 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-100 transition-all"
              >
                Ver Loja
                <ExternalLink size={18} />
              </a>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Identity */}
          <section className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                <Store className="text-neutral-900" size={20} />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Identidade da Loja</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Nome Comercial</label>
                <input 
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Slug (URL personalizada)</label>
                <input 
                  type="text" required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900 font-mono text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Logo da Loja</label>
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="w-24 h-24 rounded-[2rem] bg-neutral-50 border border-neutral-100 flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                    {formData.logoUrl ? (
                      <>
                        <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 bg-white rounded-full text-neutral-900">
                            <Camera size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        {uploading ? <Loader2 className="animate-spin text-neutral-400 mx-auto" size={24} /> : <ImageIcon className="text-neutral-200 mx-auto" size={32} />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 rounded-xl text-sm font-bold text-neutral-700 hover:bg-neutral-200 transition-all"
                      >
                        <Upload size={18} />
                        Upload Logo
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.setAttribute('capture', 'environment');
                            fileInputRef.current.click();
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 rounded-xl text-sm font-bold text-white hover:bg-neutral-800 transition-all"
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
                      onChange={handleLogoUpload}
                    />
                    <p className="text-xs text-neutral-400">Recomendado: Quadrada, fundo transparente (PNG), min. 512x512px.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                <Building2 className="text-neutral-900" size={20} />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Dados da Empresa (Opcional)</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-neutral-700 mb-1 flex items-center gap-2">
                  <Hash size={16} className="text-neutral-400" />
                  CNPJ
                </label>
                <input 
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-neutral-700 mb-1 flex items-center gap-2">
                  <MapPin size={16} className="text-neutral-400" />
                  Endereço Completo
                </label>
                <input 
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">CEP</label>
                <input 
                  type="text"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="00000-000"
                />
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                <Palette className="text-neutral-900" size={20} />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Aparência</h2>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">Cor Primária</label>
              <div className="flex items-center gap-4">
                <input 
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-12 h-12 rounded-lg border-none cursor-pointer"
                />
                <input 
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="px-4 py-2 rounded-xl border border-neutral-200 font-mono text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <p className="text-xs text-neutral-400 mt-2">Esta cor será usada nos botões e elementos principais do seu catálogo.</p>
            </div>
          </section>

          {/* Store Hours */}
          <section className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                <Clock className="text-neutral-900" size={20} />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Horário de Atendimento</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Horário de Abertura</label>
                <input 
                  type="time"
                  value={formData.openingTime}
                  onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Horário de Fechamento</label>
                <input 
                  type="time"
                  value={formData.closingTime}
                  onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <p className="text-xs text-neutral-400 md:col-span-2">O sistema usará estes horários para mostrar aos clientes se sua loja está aberta ou fechada no momento.</p>
            </div>
          </section>

          {/* Payment & Contact */}
          <section className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                <CreditCard className="text-neutral-900" size={20} />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Pagamento e Contato</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1 flex items-center gap-2">
                  <MessageCircle size={16} className="text-green-500" />
                  WhatsApp de Vendas
                </label>
                <input 
                  type="tel" required
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="5511999999999"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1 flex items-center gap-2">
                  <Instagram size={16} className="text-pink-500" />
                  Instagram da Loja
                </label>
                <input 
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value.replace('@', '') })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="ex: @minhaloja"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Chave Pix</label>
                <input 
                  type="text"
                  value={formData.pixKey}
                  onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="CPF, E-mail ou Chave Aleatória"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Mercado Pago Access Token (Opcional)</label>
                <input 
                  type="password"
                  value={formData.mercadoPagoAccessToken}
                  onChange={(e) => setFormData({ ...formData, mercadoPagoAccessToken: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="APP_USR-..."
                />
                <p className="text-xs text-neutral-400 mt-1">Necessário para processar pagamentos via cartão de crédito automaticamente.</p>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button 
              type="submit"
              disabled={submitting || uploading}
              className="bg-neutral-900 text-white px-12 py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-neutral-200"
            >
              {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

