import { Link } from 'react-router-dom';
import { ShoppingBag, Zap, Share2, Users, ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="bg-neutral-900 p-2 rounded-lg">
            <Zap className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900">VendaZap</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/login" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">Entrar</Link>
          <Link to="/register" className="bg-neutral-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200">
            Começar Grátis
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-600 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Novo: Integração com Mercado Pago
          </div>
          <h1 className="text-6xl lg:text-7xl font-bold text-neutral-900 leading-[0.9] tracking-tighter mb-8">
            Venda mais pelo <span className="text-neutral-400 italic">WhatsApp</span> sem complicação.
          </h1>
          <p className="text-lg text-neutral-600 mb-10 max-w-lg leading-relaxed">
            Crie seu catálogo digital em minutos, compartilhe o link e receba pedidos organizados direto no seu WhatsApp. Gestão de estoque e financeiro inclusos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/register" className="flex items-center justify-center gap-2 bg-neutral-900 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-neutral-800 transition-all text-lg shadow-xl shadow-neutral-200 group">
              Criar minha loja agora
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="flex items-center gap-3 px-6 py-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <img 
                    key={i}
                    src={`https://picsum.photos/seed/user${i}/100/100`} 
                    className="w-8 h-8 rounded-full border-2 border-white" 
                    alt="User"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-neutral-500">+500 lojistas ativos</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-neutral-100 overflow-hidden aspect-[4/5] relative z-10">
            <div className="bg-neutral-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <p className="text-xs opacity-60 font-medium uppercase tracking-widest">Sua Loja Digital</p>
                  <p className="font-bold">Boutique Fashion</p>
                </div>
              </div>
              <Share2 size={20} className="opacity-60" />
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-square bg-neutral-100 rounded-2xl overflow-hidden">
                      <img 
                        src={`https://picsum.photos/seed/prod${i}/400/400`} 
                        className="w-full h-full object-cover" 
                        alt="Product"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="px-1">
                      <p className="text-sm font-bold text-neutral-900">Produto Exemplo {i}</p>
                      <p className="text-xs text-neutral-500">R$ 99,90</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-neutral-200 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-neutral-300 rounded-full blur-3xl opacity-30"></div>
        </motion.div>
      </main>

      {/* Features */}
      <section className="bg-white py-24 border-y border-neutral-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 tracking-tight mb-4">Tudo que você precisa para vender online</h2>
            <p className="text-neutral-500 max-w-2xl mx-auto">Uma plataforma completa, pensada na simplicidade do dia a dia do pequeno empreendedor.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: Share2, title: 'Venda via Link', desc: 'Compartilhe seu catálogo no WhatsApp, Instagram e Facebook. O cliente compra sem baixar nada.' },
              { icon: Zap, title: 'Gestão Ágil', desc: 'Controle de estoque automático e notificações instantâneas de novos pedidos.' },
              { icon: TrendingUp, title: 'Lucro Real', desc: 'Saiba exatamente quanto você ganha em cada venda. Diferencie investimento de lucro real automaticamente.' },
              { icon: Users, title: 'CRM Integrado', desc: 'Saiba quem são seus melhores clientes e receba alertas de aniversários para vender mais.' },
            ].map((feature, i) => (
              <div key={i} className="space-y-4">
                <div className="w-12 h-12 bg-neutral-50 rounded-xl flex items-center justify-center text-neutral-900 border border-neutral-100">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-neutral-900">{feature.title}</h3>
                <p className="text-neutral-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="bg-neutral-900 rounded-[3rem] p-12 lg:p-20 text-white relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-5xl font-bold mb-6 leading-tight">Comece hoje com 7 dias grátis.</h2>
            <p className="text-neutral-400 text-lg mb-10">Sem cartão de crédito. Teste todas as funcionalidades e veja suas vendas decolarem.</p>
            <ul className="space-y-4 mb-12">
              {['Produtos ilimitados', 'Pedidos ilimitados', 'Suporte via WhatsApp', 'Relatórios financeiros'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="text-green-400" size={20} />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
            <Link to="/register" className="inline-flex items-center gap-2 bg-white text-neutral-900 px-8 py-4 rounded-2xl font-bold hover:bg-neutral-100 transition-all text-lg">
              Criar minha conta agora
            </Link>
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent hidden lg:block"></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-neutral-200 max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Zap size={20} />
          <span className="font-bold">VendaZap</span>
        </div>
        <p className="text-sm text-neutral-500">© 2026 VendaZap SaaS. Todos os direitos reservados.</p>
        <div className="flex gap-6 text-sm font-medium text-neutral-600">
          <a href="#" className="hover:text-neutral-900">Termos</a>
          <a href="#" className="hover:text-neutral-900">Privacidade</a>
        </div>
      </footer>
    </div>
  );
}
