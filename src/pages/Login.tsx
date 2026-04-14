import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Zap, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Bem-vindo de volta!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error('Erro ao entrar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user has a store
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        toast.success('Bem-vindo de volta!');
        navigate('/dashboard');
      } else {
        toast.info('Quase lá! Complete seu cadastro.');
        navigate('/register', { state: { email: user.email, googleUser: true } });
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao entrar com Google.');
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

          <h1 className="text-4xl font-bold text-neutral-900 tracking-tight mb-2">Entrar no Painel</h1>
          <p className="text-neutral-500 mb-8">Gerencie suas vendas e catálogo digital.</p>

          <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-900 text-white py-4 rounded-xl font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  Entrar
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-neutral-50 text-neutral-500">Ou continue com</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-6 w-full bg-white border border-neutral-200 text-neutral-700 py-4 rounded-xl font-bold hover:bg-neutral-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Entrar com Google
          </button>

          <p className="mt-8 text-center text-neutral-500">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-neutral-900 font-bold hover:underline">
              Criar agora
            </Link>
          </p>
        </div>
      </div>
      
      <div className="hidden md:flex flex-1 bg-neutral-900 items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <div className="mb-8 inline-block p-4 bg-white/10 rounded-3xl backdrop-blur-xl border border-white/10">
            <Zap className="text-white" size={48} />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">Venda mais com menos esforço.</h2>
          <p className="text-neutral-400 text-lg">
            "Desde que comecei a usar o VendaZap, minhas vendas pelo WhatsApp aumentaram 40% e parei de perder pedidos em conversas bagunçadas."
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <img src="https://picsum.photos/seed/testimonial/100/100" className="w-12 h-12 rounded-full border-2 border-white/20" alt="Avatar" referrerPolicy="no-referrer" />
            <div className="text-left">
              <p className="text-white font-bold">Mariana Silva</p>
              <p className="text-neutral-500 text-sm">Dona da Boutique Fashion</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
