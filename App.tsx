import React from 'react';
import { GameCanvas } from './components/GameCanvas';

function App() {
  return (
    <div className="min-h-screen w-full bg-[#050505] flex flex-col items-center text-white selection:bg-pink-500 selection:text-white py-8">
      <header className="mb-4 text-center">
        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 tracking-tighter" style={{ textShadow: '3px 3px 0px #1e3a8a' }}>
          VI-MAN
        </h1>
        <p className="mt-1 text-blue-400 text-xs tracking-widest uppercase opacity-80">The Vim-Powered Arcade Experience</p>
      </header>

      <main className="w-full flex flex-col items-center">
        <GameCanvas />
      </main>

      <footer className="w-full py-4 mt-4 text-center text-gray-700 text-xs flex flex-col gap-1">
        <p>Built with React & Canvas • No External Assets</p>
        <p>
          Vibecoded by <a href="https://hmepas.me" target="_blank" rel="noreferrer" className="hover:text-yellow-400 transition-colors underline decoration-dotted">hmepas</a> on <a href="https://gemini.google.com/" target="_blank" rel="noreferrer" className="hover:text-blue-400 transition-colors underline decoration-dotted">Gemini 3.0</a>
        </p>
      </footer>
    </div>
  );
}

export default App;