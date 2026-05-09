/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';

import { 
  Music, 
  Music2, 
  ArrowRight, 
  ChevronRight, 
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users
} from 'lucide-react';

// --- Constants & Data ---

const CATEGORIES = [
  { id: 'accessories', name: '小饰品', icon: '💍' },
  { id: 'clothes', name: '潮流服饰', icon: '👕' },
  { id: 'shoes_bags', name: '鞋子箱包', icon: '🎒' },
  { id: 'beauty', name: '美妆护肤', icon: '💄' },
  { id: 'toys', name: '趣味潮玩', icon: '🧸' },
];

interface Product {
  name: string;
  price: number;
  categoryId: string;
}

/**
 * --- ScratchCard Component ---
 */
function ScratchCard({ children, maskColor = '#E5E7EB' }: { children: React.ReactNode, maskColor?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    
    // Fill the canvas with a silver-gray gradient for a real scratch-off feel
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#C0C0C0');
    gradient.addColorStop(0.2, '#E8E8E8');
    gradient.addColorStop(0.5, '#A9A9A9');
    gradient.addColorStop(0.8, '#D3D3D3');
    gradient.addColorStop(1, '#C0C0C0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add "scratch texture"
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let i = 0; i < 100; i++) {
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }
    
    // Add text
    ctx.fillStyle = '#666666';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH TO REVEAL', canvas.width / 2, canvas.height / 2 + 3);

    ctx.globalCompositeOperation = 'destination-out';
  }, [maskColor, children]);

  useEffect(() => {
    setIsRevealed(false);
  }, [children]);

  const scratch = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isRevealed) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      const touch = e.touches[0];
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    } else {
      x = (e as React.MouseEvent).clientX - rect.left;
      y = (e as React.MouseEvent).clientY - rect.top;
    }

    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    // Percentage check
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentCount = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) transparentCount++;
    }
    if ((transparentCount / (pixels.length / 4)) > 0.45) {
      setIsRevealed(true);
    }
  };

  return (
    <div className="relative w-36 h-12 overflow-hidden rounded-xl cursor-crosshair bg-gray-100 border border-gray-200">
      <div className={`absolute inset-0 flex items-center justify-center font-black text-[#E60012] text-xl transition-opacity duration-300 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}>
        {children}
      </div>
      <motion.canvas
        ref={canvasRef}
        width={144}
        height={48}
        animate={{ opacity: isRevealed ? 0 : 1 }}
        onMouseDown={() => setIsDrawing(true)}
        onMouseMove={scratch}
        onMouseUp={() => setIsDrawing(false)}
        onMouseLeave={() => setIsDrawing(false)}
        onTouchStart={() => setIsDrawing(true)}
        onTouchMove={scratch}
        onTouchEnd={() => setIsDrawing(false)}
        className="absolute inset-0 z-10 touch-none"
      />
    </div>
  );
}

// Mock recommendation data generator - Now used primarily for state structure
const getProductImage = (name: string) => {
  return `/picture/${name}.jpg`; // Common naming pattern
};

type Step = 'cover' | 'select_mode' | 'select_category' | 'result' | 'end';
type GameMode = 'pvp' | 'pve';

export default function App() {
  const [step, setStep] = useState<Step>('cover');
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [gameProducts, setGameProducts] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load CSV Data
  useEffect(() => {
    const fetchCSV = async () => {
      try {
        const response = await fetch('/products.csv');
        const arrayBuffer = await response.arrayBuffer();
        
        // Try decoding with UTF-8 first
        let decoder = new TextDecoder('utf-8');
        let csvText = decoder.decode(arrayBuffer);
        
        // If it contains the replacement character \uFFFD, it's likely a different encoding (like GBK)
        if (csvText.includes('\uFFFD')) {
          decoder = new TextDecoder('gbk');
          csvText = decoder.decode(arrayBuffer);
        }

        Papa.parse(csvText, {
          header: false,
          skipEmptyLines: true,
          complete: (results) => {
            const parsed = results.data.map((row: any) => ({
              name: row[0],
              price: parseFloat(row[1]) || 0,
              categoryId: row[2] || 'general' // Optional category column
            }));
            setAllProducts(parsed);
          }
        });
      } catch (err) {
        console.error('Failed to load products.csv:', err);
      }
    };
    fetchCSV();
  }, []);

  // Game Logic State
  const [p1CumulativeError, setP1CumulativeError] = useState(0);
  const [p2CumulativeError, setP2CumulativeError] = useState(0);
  const [currentGuesses, setCurrentGuesses] = useState({ p1: '', p2: '' });
  const [isRoundSubmitted, setIsRoundSubmitted] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const startRoundWithCategory = (category: typeof CATEGORIES[0]) => {
    setSelectedCategory(category);
    
    // Filter and pick 3 random products
    let filtered = allProducts.filter(p => !p.categoryId || p.categoryId === 'general' || p.categoryId === category.id);
    
    if (filtered.length === 0) filtered = allProducts; // Fallback
    
    // Shuffle and pick 3
    const shuffled = [...filtered].sort(() => 0.5 - Math.random()).slice(0, 3);
    
    const formatted = shuffled.map((p, idx) => ({
      id: idx,
      title: p.name,
      desc: '三福潮趣好物，眼力大挑战',
      price: p.price,
      image: `/picture/${p.name}.jpg`, // 默认首选 jpg
      fallback: `https://source.unsplash.com/400x400/?fashion,product`
    }));
    
    setGameProducts(formatted);
    setStep('result');
  };

  const currentProduct = gameProducts[currentProductIndex];

  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle AI turn logic
  useEffect(() => {
    if (gameMode === 'pve' && step === 'result' && !isRoundSubmitted && currentProduct && !currentGuesses.p2 && !aiTimerRef.current) {
      setIsAiThinking(true);
      const thinkingTime = Math.floor(Math.random() * 5000) + 3000; // 3-8s
      
      aiTimerRef.current = setTimeout(() => {
        const actualPrice = currentProduct.price;
        const variance = 0.2; 
        const aiGuess = Math.round(actualPrice * (1 + (Math.random() * variance * 2 - variance)));
        setCurrentGuesses(prev => ({ ...prev, p2: aiGuess.toString() }));
        setIsAiThinking(false);
        aiTimerRef.current = null;
      }, thinkingTime);
    }
    
    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [gameMode, step, isRoundSubmitted, currentProductIndex, currentGuesses.p2, currentProduct]);

  // Toggle Music Logic
  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleGuessSubmit = (actualPrice: number) => {
    const p1 = parseFloat(currentGuesses.p1) || 0;
    const p2 = parseFloat(currentGuesses.p2) || 0;
    
    setP1CumulativeError(prev => prev + Math.abs(p1 - actualPrice));
    setP2CumulativeError(prev => prev + Math.abs(p2 - actualPrice));
    setIsRoundSubmitted(true);
  };

  const nextProduct = () => {
    if (currentProductIndex < gameProducts.length - 1) {
      setCurrentProductIndex(prev => prev + 1);
      setCurrentGuesses({ p1: '', p2: '' });
      setIsRoundSubmitted(false);
    } else {
      setStep('end');
    }
  };

  const reset = () => {
    setStep('cover');
    setP1CumulativeError(0);
    setP2CumulativeError(0);
    setCurrentGuesses({ p1: '', p2: '' });
    setIsRoundSubmitted(false);
    setCurrentProductIndex(0);
    setIsAiThinking(false);
  };

  return (
    <div className="relative w-full h-screen max-w-[450px] mx-auto bg-white overflow-hidden font-sans shadow-2xl flex flex-col items-center">
      
      <audio 
        ref={audioRef} 
        loop 
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
      />

      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={toggleMusic}
          className={`p-3 rounded-full bg-white/20 backdrop-blur-md shadow-lg transition-transform ${isPlaying ? 'animate-spin-slow' : ''}`}
        >
          {isPlaying ? <Music className="w-5 h-5 text-[#E60012]" /> : <Music2 className="w-5 h-5 text-gray-400" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        
        {step === 'cover' && (
          <motion.div 
            key="cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 w-full flex flex-col items-center justify-center p-8 relative overflow-hidden bg-white"
          >
            <div className="absolute inset-0 overflow-hidden">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], x: [0, 20, 0], y: [0, -20, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[#E60012]/15 blur-[80px]"
              />
              <motion.div 
                animate={{ scale: [1.2, 1, 1.2], x: [0, -30, 0], y: [0, 30, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[#F39800]/15 blur-[80px]"
              />
              <motion.div 
                animate={{ scale: [1, 1.3, 1], x: [0, 40, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-[#00A0E9]/15 blur-[80px]"
              />
            </div>

            <div className="text-center z-10">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <img 
                  src="/sanfu-logo.png" 
                  alt="SANFU Logo" 
                  className="h-16 mx-auto drop-shadow-xl" 
                  onError={(e) => {
                    // Fallback if the logo file is named differently or missing
                    e.currentTarget.src = 'https://img.alicdn.com/imgextra/i4/2208466100588/O1CN01fPz4zG1w4zY6I6v6t_!!2208466100588.jpg';
                  }}
                />
              </motion.div>
              
              <motion.h1 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-900 text-6xl font-black mb-4 leading-tight font-display"
              >
                生活新<br/><span className="text-[#E60012]">「竞」</span>拍
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-gray-500 text-lg mb-12"
              >
                选择你的挑战系列<br/>和好友一起PK价格敏锐度
              </motion.p>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setStep('select_mode')}
                className="group relative bg-[#E60012] text-white px-12 py-5 rounded-full font-bold text-xl shadow-[0_15px_30px_rgba(230,0,18,0.25)] flex items-center gap-3 overflow-hidden"
              >
                <span className="relative z-10">立即开启</span>
                <ArrowRight className="relative z-10 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 'select_mode' && (
          <motion.div 
            key="mode"
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -300, opacity: 0 }}
            className="flex-1 w-full flex flex-col items-center justify-center p-8 bg-white"
          >
            <h2 className="text-4xl font-black mb-12 font-display">选择挑战模式</h2>
            <div className="w-full space-y-6">
              <button 
                onClick={() => { setGameMode('pvp'); setStep('select_category'); }}
                className="w-full p-8 rounded-[40px] border-2 border-gray-100 flex flex-col items-center gap-4 hover:border-[#E60012] transition-colors group shadow-sm hover:shadow-md"
              >
                <Users className="w-12 h-12 text-[#E60012]" />
                <div className="text-center">
                  <p className="text-xl font-black">好友面基</p>
                  <p className="text-gray-400 text-sm">双人同屏竞猜，默契与眼力的较量</p>
                </div>
              </button>
              <button 
                onClick={() => { setGameMode('pve'); setStep('select_category'); }}
                className="w-full p-8 rounded-[40px] border-2 border-gray-100 flex flex-col items-center gap-4 hover:border-[#00A0E9] transition-colors group shadow-sm hover:shadow-md"
              >
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=sanfu" alt="bot" className="w-12 h-12" />
                </motion.div>
                <div className="text-center">
                  <p className="text-xl font-black">单人对抗 AI</p>
                  <p className="text-gray-400 text-sm">挑战三福智造机器人，你能赢过它吗？</p>
                </div>
              </button>
            </div>
            
            <button onClick={() => setStep('cover')} className="mt-12 text-gray-400 text-sm font-bold flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> 返回封面
            </button>
          </motion.div>
        )}

        {step === 'select_category' && (
          <motion.div 
            key="category"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="flex-1 w-full flex flex-col p-8 bg-white"
          >
            <div className="mt-12 mb-8">
              <div 
                className="w-16 h-1 w-20 rounded-full mb-6 bg-[#E60012]" 
              />
              <h2 className="text-4xl font-black text-gray-800 mb-2 font-display">挑战哪个系列？</h2>
              <p className="text-gray-500">潮流生活，由你定义</p>
            </div>

            <div className="space-y-4 flex-1">
              {CATEGORIES.map((cat, index) => (
                <motion.button
                  key={cat.id}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startRoundWithCategory(cat)}
                  className="w-full p-6 rounded-3xl border-2 border-gray-100 bg-white hover:border-[#E60012] transition-all flex items-center justify-between group shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{cat.icon}</span>
                    <span className="text-xl font-black text-gray-700">{cat.name}</span>
                  </div>
                  <ChevronRight className="text-gray-300 group-hover:text-[#E60012]" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div 
            key="result"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 w-full flex flex-col bg-gray-50 overflow-hidden"
          >
            {/* Round info */}
            <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center z-20 shadow-sm">
               <div className="flex gap-2">
                 {[0, 1, 2].map(i => (
                   <div key={i} className={`w-3 h-3 rounded-full transition-colors duration-500 ${i < currentProductIndex ? 'bg-black' : i === currentProductIndex ? 'bg-[#E60012]' : 'bg-gray-200'}`} />
                 ))}
               </div>
               <span className="text-xs font-black text-gray-400">ROUND {currentProductIndex + 1}/3</span>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
              <div className="p-6">
                <div className="bg-white rounded-[40px] shadow-xl overflow-hidden border border-gray-100 mb-6">
                  <div className="h-64 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                    {currentProduct && (
                      <img 
                        src={currentProduct.image} 
                        alt="product" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = currentProduct.fallback;
                        }}
                      />
                    )}
                    <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md rounded-full px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-tighter mix-blend-difference">
                      Sanfu Fashion
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-black text-gray-900 mb-2 font-display">{currentProduct?.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{currentProduct?.desc}</p>
                  </div>
                </div>

                {/* Guessing Module */}
                <div className="space-y-6">
                  {!isRoundSubmitted ? (
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-3">
                          <div className="flex items-center gap-2 px-2">
                            <Users className="w-3 h-3 text-red-500" />
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Player 1</label>
                          </div>
                          <input 
                            type="number"
                            placeholder="猜价格"
                            value={currentGuesses.p1}
                            onChange={e => setCurrentGuesses(prev => ({ ...prev, p1: e.target.value }))}
                            className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl focus:border-[#E60012] outline-none font-bold text-xl transition-all shadow-sm"
                          />
                       </div>
                       <div className="space-y-3">
                          <div className="flex items-center gap-2 px-2">
                            {gameMode === 'pve' ? (
                              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=sanfu" alt="bot" className="w-3 h-3" />
                            ) : (
                              <Users className="w-3 h-3 text-blue-500" />
                            )}
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{gameMode === 'pve' ? '三福小助手 AI' : 'Player 2'}</label>
                          </div>
                          {gameMode === 'pve' ? (
                            <div className={`w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl h-[60px] flex items-center justify-center transition-all ${isAiThinking ? 'border-blue-400' : ''}`}>
                              {isAiThinking ? (
                                <div className="flex gap-1">
                                  <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-blue-400" />
                                  <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 rounded-full bg-blue-400" />
                                  <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 rounded-full bg-blue-400" />
                                </div>
                              ) : (
                                <span className={`font-bold text-xl ${currentGuesses.p2 ? 'text-gray-800' : 'text-gray-300'}`}>
                                  {currentGuesses.p2 || '等待对方输入'}
                                </span>
                              )}
                            </div>
                          ) : (
                            <input 
                              type="number"
                              placeholder="猜价格"
                              value={currentGuesses.p2}
                              onChange={e => setCurrentGuesses(prev => ({ ...prev, p2: e.target.value }))}
                              className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl focus:border-[#00A0E9] outline-none font-bold text-xl transition-all shadow-sm"
                            />
                          )}
                       </div>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white p-6 rounded-[32px] shadow-lg border-2 border-[#E60012]/10 space-y-4"
                    >
                       <div className="text-center flex flex-col items-center">
                          <p className="text-xs text-gray-400 font-bold mb-4 uppercase tracking-tighter">刮开看本季真实价格</p>
                          <ScratchCard>
                        ￥{currentProduct?.price}
                      </ScratchCard>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-50 mt-4">
                      <div className="text-center p-3 rounded-2xl bg-red-50/50">
                         <p className="text-[10px] text-red-400 font-bold uppercase mb-1">P1 误差分</p>
                         <p className="text-xl font-black text-gray-800">
                           +{Math.abs((parseFloat(currentGuesses.p1) || 0) - (currentProduct?.price || 0)).toFixed(1)}
                         </p>
                      </div>
                      <div className="text-center p-3 rounded-2xl bg-blue-50/50">
                         <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">P2 误差分</p>
                         <p className="text-xl font-black text-gray-800">
                           +{Math.abs((parseFloat(currentGuesses.p2) || 0) - (currentProduct?.price || 0)).toFixed(1)}
                         </p>
                      </div>
                   </div>
                    </motion.div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    disabled={!isRoundSubmitted && (!currentGuesses.p1 || !currentGuesses.p2)}
                    onClick={() => isRoundSubmitted ? nextProduct() : handleGuessSubmit(currentProduct?.price || 0)}
                    className={`w-full py-5 rounded-full font-black text-lg shadow-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 ${
                      isRoundSubmitted ? 'bg-black text-white' : 'bg-[#E60012] text-white hover:bg-[#c40010]'
                    }`}
                  >
                    {isRoundSubmitted ? (
                      <>
                        {currentProductIndex === gameProducts.length - 1 ? '揭晓最终大赢家' : '挑战下一件'}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    ) : (
                      '锁定猜测'
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'end' && (
          <motion.div 
            key="end"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex-1 w-full bg-white flex flex-col p-8 items-center text-center overflow-y-auto no-scrollbar relative"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[50%] rounded-full bg-[#E60012]/5 blur-[100px]" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[50%] rounded-full bg-[#00A0E9]/5 blur-[100px]" />
            </div>

            <div className="mt-8 mb-12 z-10 w-full">
               <motion.div 
                 initial={{ scale: 0, rotate: -20 }} 
                 animate={{ scale: 1, rotate: 0 }} 
                 transition={{ type: "spring", damping: 12 }}
                 className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mb-6 shadow-2xl mx-auto border-4 border-[#E60012]"
               >
                 <img 
                   src="/sanfu-logo.png" 
                   alt="SANFU Logo" 
                   className="w-16 h-auto" 
                   onError={(e) => {
                     e.currentTarget.src = 'https://img.alicdn.com/imgextra/i4/2208466100588/O1CN01fPz4zG1w4zY6I6v6t_!!2208466100588.jpg';
                   }}
                 />
               </motion.div>
               <h2 className="text-4xl font-black text-gray-900 mb-6 font-display">最终战报</h2>
               
               <div className="bg-gray-50 rounded-[40px] p-8 mb-8 space-y-8 relative overflow-hidden shadow-inner">
                  <div className="flex justify-around items-end gap-4 h-48">
                     <div className="flex flex-col items-center flex-1">
                        <Users className={`w-6 h-6 mb-2 ${p1CumulativeError <= p2CumulativeError ? 'text-[#E60012]' : 'text-gray-300'}`} />
                        <div className={`w-full rounded-t-3xl transition-all duration-1000 ease-out border-b-4 border-white/50 ${p1CumulativeError <= p2CumulativeError ? 'bg-[#E60012] h-32' : 'bg-gray-200 h-20 opacity-50'}`} />
                        <p className={`mt-4 font-black text-2xl ${p1CumulativeError <= p2CumulativeError ? 'text-gray-900' : 'text-gray-400'}`}>Σ {p1CumulativeError.toFixed(0)}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Player 1 误差</p>
                     </div>
                     <div className="flex flex-col items-center flex-1">
                        {gameMode === 'pve' ? (
                          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=sanfu" alt="bot" className={`w-6 h-6 mb-2 ${p2CumulativeError <= p1CumulativeError ? 'opacity-100' : 'opacity-30'}`} />
                        ) : (
                          <Users className={`w-6 h-6 mb-2 ${p2CumulativeError <= p1CumulativeError ? 'text-[#00A0E9]' : 'text-gray-300'}`} />
                        )}
                        <div className={`w-full rounded-t-3xl transition-all duration-1000 ease-out border-b-4 border-white/50 ${p2CumulativeError <= p1CumulativeError ? 'bg-[#00A0E9] h-32' : 'bg-gray-200 h-20 opacity-50'}`} />
                        <p className={`mt-4 font-black text-2xl ${p2CumulativeError <= p1CumulativeError ? 'text-gray-900' : 'text-gray-400'}`}>Σ {p2CumulativeError.toFixed(0)}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{gameMode === 'pve' ? '三福机器人' : 'Player 2'} 误差</p>
                     </div>
                  </div>
                  
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="pt-8 border-t border-gray-100 relative"
                  >
                     <div className="inline-block px-6 py-2 bg-black text-white rounded-full font-black text-lg shadow-lg mb-2">
                        {p1CumulativeError === p2CumulativeError ? '平分秋色' : p1CumulativeError < p2CumulativeError ? 'Player 1 潮流主理人' : gameMode === 'pve' ? '机器人更懂潮流' : 'Player 2 潮流主理人'}
                     </div>
                     <p className="text-xs text-gray-500 italic leading-relaxed px-4">
                        {(() => {
                           const diff = Math.abs(p1CumulativeError - p2CumulativeError);
                           if (diff < 10) return "你们对潮趣的直觉真是不相上下，简直是三福的资深星人！";
                           if (diff < 50) return "哎呀，有一位的潮趣雷达似乎稍微偏离了轨道，下次再准一点哦～";
                           return "哇！你们的物价观正在跨次元碰撞！是时候互相安利一下三福的性价比了～";
                        })()}
                     </p>
                     {p1CumulativeError !== p2CumulativeError && (
                       <Sparkles className="absolute top-4 right-0 w-8 h-8 text-yellow-400 opacity-50" />
                     )}
                  </motion.div>
               </div>
            </div>

            <div className="w-full grid grid-cols-1 gap-6 mb-12 z-10">
               <div className="bg-white/70 backdrop-blur-md rounded-[32px] p-6 border border-white shadow-sm flex items-center gap-4 hover:shadow-md transition-all active:scale-95">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex-shrink-0 flex items-center justify-center border border-gray-100 overflow-hidden p-2">
                    <img 
                      src="/sanfu-logo.png" 
                      alt="SANFU QR" 
                      className="w-full h-auto opacity-50" 
                      onError={(e) => {
                        e.currentTarget.src = 'https://img.alicdn.com/imgextra/i4/2208466100588/O1CN01fPz4zG1w4zY6I6v6t_!!2208466100588.jpg';
                      }}
                    />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-black text-gray-800">关注三福小红书</p>
                    <p className="text-xs text-gray-400">发现更多高性价比好物</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
               </div>
               <div className="bg-white/70 backdrop-blur-md rounded-[32px] p-6 border border-white shadow-sm flex items-center gap-4 hover:shadow-md transition-all active:scale-95">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex-shrink-0 flex items-center justify-center border border-gray-100 overflow-hidden p-2">
                    <img 
                      src="/sanfu-logo.png" 
                      alt="SANFU MP" 
                      className="w-full h-auto opacity-50" 
                      onError={(e) => {
                        e.currentTarget.src = 'https://img.alicdn.com/imgextra/i4/2208466100588/O1CN01fPz4zG1w4zY6I6v6t_!!2208466100588.jpg';
                      }}
                    />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-black text-gray-800">三福官方小程序</p>
                    <p className="text-xs text-gray-400">一键拥有你们竞猜的单品</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
               </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={reset}
              className="w-full py-5 rounded-full bg-black text-white font-black flex items-center justify-center gap-3 shadow-xl z-10 mb-8"
            >
              <RotateCcw className="w-5 h-5" /> 换个系列再战
            </motion.button>
            
            <p className="text-gray-300 text-[10px] italic pb-8">
               SANFU FASHION · PRICE GUESSING CHALLENGE
            </p>
          </motion.div>
        )}

      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}} />
    </div>
  );
}
