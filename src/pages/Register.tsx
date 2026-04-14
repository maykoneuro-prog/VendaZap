import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Zap, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.googleUser) {
      setEmail(location.state.email || '');
      setStep(2);
    }
  }, [location.state]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let user = auth.currentUser;

      if (!user) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }

      // Create store
      const slug = storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
      const storeRef = await addDoc(collection(db, 'stores'), {
        name: storeName,
        slug,
        whatsapp,
        cnpj,
        address,
        cep,
        ownerId: user.uid,
        primaryColor: '#000000',
        subscriptionStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      // Create user mapping
      await setDoc(doc(db, 'users', user.uid), {
        email,
        storeId: storeRef.id,
        createdAt: new Date().toISOString(),
      });

      toast.success('Conta criada com sucesso! Aproveite seus 7 dias grátis.');
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setEmail(result.user.email || '');
      setStep(2);
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao conectar com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-24 py-12">
        <div className="max-w-md w-full mx-auto">
          <Link to="/" className="flex items-center gap-2 mb-12">
            <div className="bg-neutral-900 p-2 rounded-lg">
              <Zap className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight text-neutral-900">VendaZap</span>
          </Link>

          <div className="mb-8">
            <div className="flex gap-2 mb-4">
              <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-neutral-900' : 'bg-neutral-200'}`}></div>
              <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-neutral-900' : 'bg-neutral-200'}`}></div>
            </div>
            <h1 className="text-4xl font-bold text-neutral-900 tracking-tight mb-2">
              {step === 1 ? 'Comece seu teste grátis' : 'Configure sua loja'}
            </h1>
            <p className="text-neutral-500">
              {step === 1 ? 'Crie sua conta de acesso.' : 'Dados básicos para seu catálogo.'}
            </p>
          </div>

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleRegister} className="space-y-4">
            {step === 1 ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Senha</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-neutral-900 text-white py-4 rounded-xl font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
                >
                  Continuar
                  <ArrowRight size={20} />
                </button>

                <div className="mt-6 relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-neutral-50 text-neutral-500">Ou continue com</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleRegister}
                  disabled={loading}
                  className="mt-6 w-full bg-white border border-neutral-200 text-neutral-700 py-4 rounded-xl font-bold hover:bg-neutral-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                  Cadastrar com Google
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Nome da Loja</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                    placeholder="Ex: Boutique Fashion"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">WhatsApp de Vendas</label>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                    placeholder="5511999999999"
                  />
                  <p className="text-xs text-neutral-400 mt-1">Inclua o código do país e DDD (apenas números).</p>
                </div>
                <div className="grid grid-cols-1 gap-4 pt-4 border-t border-neutral-100">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Dados da Empresa (Opcional)</p>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                      placeholder="Rua, Número, Bairro..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1">CEP</label>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                      placeholder="00000-000"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 px-4 py-4 rounded-xl border border-neutral-200 font-bold hover:bg-neutral-100 transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-neutral-900 text-white py-4 rounded-xl font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        Finalizar Cadastro
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="mt-8 text-center text-neutral-500">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-neutral-900 font-bold hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
      
      <div className="hidden md:flex flex-1 bg-neutral-900 items-center justify-center p-12">
        <div className="max-w-lg">
          <h2 className="text-4xl font-bold text-white mb-8 leading-tight">O que você ganha no teste grátis:</h2>
          <ul className="space-y-6">
            {[
              'Catálogo digital personalizado',
              'Pedidos ilimitados no WhatsApp',
              'Gestão de estoque em tempo real',
              'CRM para fidelização de clientes',
              'Relatórios de lucro e fluxo de caixa'
            ].map((item) => (
              <li key={item} className="flex items-center gap-4 text-neutral-300 text-lg">
                <div className="bg-green-500/20 p-1 rounded-full">
                  <CheckCircle2 className="text-green-500" size={24} />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
