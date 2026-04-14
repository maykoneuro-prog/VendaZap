import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Wallet, 
  Settings, 
  LogOut,
  Menu,
  X,
  ShieldCheck
} from 'lucide-react';
import { useState } from 'react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PLATFORM_OWNER_EMAIL = 'maykon.euro@gmail.com';

interface LayoutProps {
  children: ReactNode;
  storeName?: string;
  primaryColor?: string;
}

export default function Layout({ children, storeName = 'VendaZap', primaryColor = '#171717' }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Package, label: 'Produtos', path: '/products' },
    { icon: ShoppingCart, label: 'Pedidos', path: '/orders' },
    { icon: Users, label: 'Clientes', path: '/customers' },
    { icon: Wallet, label: 'Financeiro', path: '/finance' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  if (auth.currentUser?.email === PLATFORM_OWNER_EMAIL) {
    menuItems.push({ icon: ShieldCheck, label: 'Admin Global', path: '/admin-global' });
  }

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-neutral-200 sticky top-0 h-screen">
        <div className="p-6 border-b border-neutral-100">
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">{storeName}</h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-widest font-medium">Painel do Vendedor</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                location.pathname === item.path 
                  ? "text-white shadow-lg shadow-neutral-200" 
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              )}
              style={location.pathname === item.path ? { backgroundColor: primaryColor } : {}}
            >
              <item.icon size={20} className={cn(
                "transition-colors",
                location.pathname === item.path ? "text-white" : "text-neutral-400 group-hover:text-neutral-900"
              )} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 z-50 p-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-900">{storeName}</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-40 pt-20 p-6">
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-4 rounded-xl text-lg font-medium",
                  location.pathname === item.path ? "text-white" : "text-neutral-600"
                )}
                style={location.pathname === item.path ? { backgroundColor: primaryColor } : {}}
              >
                <item.icon size={24} />
                <span>{item.label}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-4 w-full text-left text-red-600 text-lg font-medium"
            >
              <LogOut size={24} />
              <span>Sair</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1 md:p-8 p-4 pt-20 md:pt-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
        
        {/* Footer */}
        <footer className="p-8 border-t border-neutral-100 text-center">
          <p className="text-sm text-neutral-400">
            Versão Beta • Construída em 2026 por <a href="https://recifesolucoes.online" target="_blank" rel="noreferrer" className="hover:text-neutral-900 transition-colors font-medium">Recifesoluções.online</a>
          </p>
        </footer>
      </main>
    </div>
  );
}
