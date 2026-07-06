import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';

interface HeaderProps {
  onHistoryClick: () => void;
  onPracticeClick: () => void;
  onHomeClick: () => void;
  onJourneyClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHistoryClick, onPracticeClick, onHomeClick, onJourneyClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Cada item do menu mobile fecha o menu e dispara a ação — sem deixar o
  // painel aberto por cima do conteúdo que a pessoa acabou de abrir.
  const runAndClose = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  const navItems: { label: string; onClick: () => void }[] = [
    { label: 'Início', onClick: onHomeClick },
    { label: 'Prática', onClick: onPracticeClick },
    { label: 'Jornada', onClick: onJourneyClick },
    { label: 'Histórico', onClick: onHistoryClick },
  ];

  return (
    <header className="w-full py-3 md:py-6 border-b border-zinc-900 bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={runAndClose(onHomeClick)}>
          <div className="p-2 bg-lime-400 rounded-lg shadow-lg shadow-lime-400/20">
            <Logo className="w-6 h-6 text-black" />
          </div>
          <div>
            <span className="block text-xl font-bold text-white tracking-tight">Demóstenes</span>
            <p className="text-xs text-zinc-500 font-medium tracking-wider uppercase">Treinador de Oratória</p>
          </div>
        </div>

        {/* Navegação desktop (inalterada) */}
        <div className="hidden md:flex items-center space-x-6 text-sm font-medium text-zinc-400">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="hover:text-lime-400 cursor-pointer transition-colors focus:outline-none"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Botão hamburger — só no mobile (abaixo de md) */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden p-2 -mr-2 text-zinc-300 hover:text-lime-400 transition-colors focus:outline-none"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Painel do menu mobile: abre abaixo do header, ocupa a largura toda,
          itens empilhados com área de toque ≥48px. Desktop nunca vê isto. */}
      {menuOpen && (
        <nav className="md:hidden border-t border-zinc-900 bg-black/95 backdrop-blur-md animate-fadeIn">
          <div className="container mx-auto px-4 py-2 flex flex-col">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={runAndClose(item.onClick)}
                className="w-full text-left min-h-[48px] px-2 py-3 text-base font-medium text-zinc-300 hover:text-lime-400 border-b border-zinc-900/70 last:border-b-0 transition-colors focus:outline-none"
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
