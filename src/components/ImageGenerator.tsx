import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wand2, X, Image as ImageIcon, Loader2, Download, RefreshCw } from 'lucide-react';
import { cn, downloadImage } from '../lib/utils';
import { useStore } from '../store/useStore';

interface ImageGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, options?: any) => Promise<string>;
  onUpscale?: (image: string) => Promise<string>;
  initialPrompt?: string;
}

export const ImageGenerator = ({ isOpen, onClose, onGenerate, onUpscale, initialPrompt }: ImageGeneratorProps) => {
  const setCreativeMode = useStore(state => state.setCreativeMode);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCreativeMode(true);
      if (initialPrompt) {
        setPrompt(initialPrompt);
      }
    } else {
      // Keep creative mode active if we have a generated image, otherwise revert
      if (!generatedImage) {
        setCreativeMode(false);
      }
    }
  }, [isOpen, generatedImage, setCreativeMode, initialPrompt]);

  const [style, setStyle] = useState<'realistic' | 'surreal' | 'minimal' | 'cyberpunk' | 'vibrant'>('realistic');
  const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('4K');
  const [synthesisStage, setSynthesisStage] = useState(0);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const suggestionRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const SUGGESTION_BANK = [
    // Styles
    'Cyberpunk', 'Steampunk', 'Synthwave', 'Vaporwave', 'Art Deco', 'Art Nouveau', 'Brutalism', 'Surrealism',
    'Impressionism', 'Expressionism', 'Minimalism', 'Bioluminescent', 'Gothic', 'Ukiyo-e', 'Pop Art',
    
    // Lighting
    'Volumetric Lighting', 'Cinematic Lighting', 'Chiaroscuro', 'Golden Hour', 'Blue Hour', 'Soft Glow',
    'God Rays', 'Rim Lighting', 'Bioluminescent Glow', 'Neon Atmosphere', 'Studio Lighting', 'High Contrast',
    
    // Composites/Fidelity
    'Hyper-realistic', 'Photorealistic', '8K UHD', 'Masterpiece', 'Highly Detailed', 'Intricate Textures',
    'Ray Tracing', 'Octane Render', 'Unreal Engine 5 Render', 'Macro Photography', 'Depth of Field', 'Sharp Focus',
    
    // Subjects/Concepts
    'Futuristic Cityscape', 'Ethereal Forest', 'Ancient Ruins', 'Interstellar Nebula', 'Cybernetic Augmented',
    'Floating Islands', 'Clockwork Mechanism', 'Deep Sea Abyss', 'Abstract Geometry', 'Post-Apocalyptic'
  ];

  const promptKeywords = {
    atmosphere: ['Ethereal', 'Moody', 'Cinematic', 'Vibrant', 'Serene'],
    lighting: ['Volumetric', 'Bioluminescent', 'Global Illumination', 'Cyberpunk Neon'],
    fidelity: ['Hyper-realistic', 'Intricate Detail', '8K UHD', 'Masterpiece']
  };

  const neuralExamples = [
    "Futuristic neo-tokyo cityscape under rain, neon reflections",
    "Mystical forest with bioluminescent flora, ethereal mood",
    "Brutalist architectural study, desert sun, high contrast"
  ];

  const appendKeyword = (keyword: string) => {
    setPrompt(prev => {
      const clean = prev.trim();
      if (!clean) return keyword;
      if (clean.toLowerCase().includes(keyword.toLowerCase())) return prev;
      return `${clean}, ${keyword}`;
    });
  };

  useEffect(() => {
    const parts = prompt.split(',');
    const currentPart = parts[parts.length - 1].trim().toLowerCase();
    
    if (currentPart.length > 1) {
      const filtered = SUGGESTION_BANK.filter(s => 
        s.toLowerCase().includes(currentPart) && 
        !prompt.toLowerCase().includes(s.toLowerCase())
      ).slice(0, 5);
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
    setSelectedIndex(-1);
  }, [prompt]);

  // Click outside listener for suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionRef.current && 
        !suggestionRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setFilteredSuggestions([]);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applySuggestion = (suggestion: string) => {
    setPrompt(prev => {
      const parts = prev.split(',');
      parts[parts.length - 1] = ` ${suggestion}`;
      return parts.join(',').trim() + ', ';
    });
    setFilteredSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        applySuggestion(filteredSuggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setFilteredSuggestions([]);
      }
    }
  };

  const synthesisStages = [
    "Initializing Neural Pipeline",
    "Mapping Semantic Vectors",
    "Synthesizing 4K UHD Textures",
    "Applying Neo-Banana Filters",
    "Verifying Fidelity Integrity",
    "Finalizing Neural Asset"
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setSynthesisStage(0);
      interval = setInterval(() => {
        setSynthesisStage(prev => (prev < synthesisStages.length - 1 ? prev + 1 : prev));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleDownload = () => {
    if (generatedImage) {
      downloadImage(generatedImage, `velora-neural-asset-${Date.now()}.png`);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setSynthesisStage(0);
    setError(null);
    try {
      // Sanitize and format prompt (remove excessive commas, normalize spacing)
      const sanitizedPrompt = prompt
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .join(', ');
        
      const highFidelityPrompt = sanitizedPrompt;
      const imageUrl = await onGenerate(highFidelityPrompt, { style, resolution, negativePrompt });
      setGeneratedImage(imageUrl);
      setPrompt(sanitizedPrompt); // Update UI with sanitized prompt
    } catch (err: any) {
      setError(err.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpscale = async () => {
    if (!generatedImage || !onUpscale || isUpscaling) return;
    setIsUpscaling(true);
    setSynthesisStage(0); // Optional: use stages for upscale too
    setError(null);
    try {
      const upscaledUrl = await onUpscale(generatedImage);
      setGeneratedImage(upscaledUrl);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Neural upscale failed');
    } finally {
      setIsUpscaling(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative w-full max-w-2xl bg-white dark:bg-[#080810] rounded-[3rem] shadow-3xl overflow-hidden border border-neutral-200 dark:border-white/10"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />

            <div className="p-8 md:p-10 relative z-10">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 rotate-3">
                    <Wand2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tighter">Velora Studio</h2>
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-indigo-500/80">Neural Asset Pipeline v4.0</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-white/5 rounded-2xl transition-all"
                >
                  <X className="w-5 h-5 text-neutral-400 hover:text-red-500 transition-colors" />
                </button>
              </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Synthesis Style</span>
                      <div className="flex flex-wrap items-center gap-2 px-1">
                        {['realistic', 'surreal', 'cyberpunk', 'vibrant', 'minimal'].map((q) => (
                          <button
                            key={q}
                            onClick={() => setStyle(q as any)}
                            className={cn(
                              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                              style === q 
                                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" 
                                : "bg-neutral-100 dark:bg-white/5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                            )}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Neural Resolution</span>
                      <div className="flex items-center gap-2 px-1">
                        {['1K', '2K', '4K'].map((r) => (
                          <button
                            key={r}
                            onClick={() => setResolution(r as any)}
                            className={cn(
                              "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              resolution === r 
                                ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30" 
                                : "bg-neutral-100 dark:bg-white/5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-0 group-focus-within:opacity-20 transition-opacity" />
                    <textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Input neural specifications for synthesis..."
                      className="relative w-full h-32 bg-white dark:bg-[#0c0c15] border border-neutral-200 dark:border-white/5 rounded-3xl p-6 outline-none resize-none text-base text-neutral-900 dark:text-white placeholder:text-neutral-500/50 focus:border-indigo-500/50 transition-all font-medium leading-relaxed"
                    />

                    {/* Negative Prompt Input */}
                    <div className="mt-4 relative group/neg">
                      <div className="absolute -inset-0.5 bg-red-500 rounded-2xl blur opacity-0 group-focus-within/neg:opacity-10 transition-opacity" />
                      <textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="Neural Exclusions (Elements to avoid...)"
                        className="relative w-full h-20 bg-white dark:bg-[#0c0c15] border border-neutral-200 dark:border-white/5 rounded-2xl p-4 outline-none resize-none text-xs text-neutral-900 dark:text-white placeholder:text-neutral-500/30 focus:border-red-500/30 transition-all font-medium leading-relaxed"
                      />
                    </div>

                    {/* Neural Recommendation Panel (Tag Cloud) */}
                    <AnimatePresence>
                      {filteredSuggestions.length > 0 && (
                        <motion.div
                          ref={suggestionRef}
                          initial={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, scale: 0.95, y: -5, filter: 'blur(10px)' }}
                          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                          className="absolute z-50 left-0 right-0 top-full mt-4 p-5 bg-white/80 dark:bg-[#0c0c15]/90 border border-neutral-200/50 dark:border-white/10 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] backdrop-blur-2xl"
                        >
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-white/5 pb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em]">Neural Associations</span>
                              </div>
                              <span className="text-[8px] font-bold text-indigo-500/60 uppercase tracking-widest">Latent Logic Active</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {filteredSuggestions.map((suggestion, idx) => (
                                <motion.button
                                  key={suggestion}
                                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                                  animate={{ opacity: 1, scale: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  onClick={() => applySuggestion(suggestion)}
                                  onMouseEnter={() => setSelectedIndex(idx)}
                                  className={cn(
                                    "px-4 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-tight transition-all relative overflow-hidden group/tag",
                                    selectedIndex === idx 
                                      ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-110 z-10" 
                                      : "bg-neutral-50 dark:bg-white/5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-neutral-100 dark:border-white/5"
                                  )}
                                >
                                  {/* Selection Glow */}
                                  {selectedIndex === idx && (
                                    <motion.div 
                                      layoutId="active-tag-glow"
                                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                                      animate={{ x: ['-100%', '100%'] }}
                                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    />
                                  )}
                                  <span className="relative z-10">{suggestion}</span>
                                </motion.button>
                              ))}
                            </div>

                            {selectedIndex >= 0 && (
                              <div className="flex items-center gap-2 pt-1">
                                <kbd className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/5 text-[8px] font-black text-neutral-400 border border-neutral-200 dark:border-white/10 uppercase">Enter</kbd>
                                <span className="text-[9px] font-medium text-neutral-400 italic">Inject into neural stream</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Neural Prompting Guide */}
                  <div className="flex flex-col gap-3 py-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-600 uppercase tracking-[0.2em]">Augmentation Vectors</span>
                      <span className="text-[9px] text-neutral-400 font-medium italic">Select to refine neural output</span>
                    </div>
                    <div className="flex flex-wrap gap-2 px-1">
                      {Object.entries(promptKeywords).flatMap(([cat, keywords]) => 
                        keywords.map(kw => (
                          <button
                            key={kw}
                            onClick={() => appendKeyword(kw)}
                            className="px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-200/50 dark:border-white/5 text-[10px] font-bold text-neutral-500 hover:text-indigo-500 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all uppercase tracking-tighter"
                          >
                            {kw}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {!prompt && (
                    <div className="flex flex-col gap-3 py-2 border-t border-neutral-100 dark:border-white/5 mt-2 animate-in fade-in slide-in-from-top-1">
                      <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-600 uppercase tracking-[0.2em] px-1">Neural Blueprints</span>
                      <div className="space-y-2">
                        {neuralExamples.map((ex) => (
                          <button
                            key={ex}
                            onClick={() => setPrompt(ex)}
                            className="w-full text-left p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/5 hover:border-indigo-500/30 hover:bg-neutral-950 dark:hover:bg-white transition-all group"
                          >
                            <p className="text-[11px] text-neutral-500 group-hover:text-white dark:group-hover:text-neutral-950 transition-colors font-medium">{ex}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs font-bold text-red-500 uppercase tracking-tight flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Neural Sync Error: {error}
                  </motion.div>
                )}

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className={cn(
                      "flex-1 font-black py-5 px-8 rounded-3xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-98 transition-all shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] dark:shadow-none border border-transparent",
                      isGenerating 
                        ? "bg-neutral-500 dark:bg-neutral-800 text-white dark:text-neutral-500 cursor-wait" 
                        : "bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:shadow-indigo-500/20"
                    )}
                  >
                    {isGenerating ? (
                      <>
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => (
                            <motion.div
                              key={i}
                              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 rounded-full bg-white dark:bg-indigo-500"
                            />
                          ))}
                        </div>
                        <span className="ml-2 uppercase tracking-widest text-[10px]">Processing Synapses</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                        <span className="uppercase tracking-[0.2em] text-xs">Execute Synthesis</span>
                      </>
                    )}
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {generatedImage ? (
                    <motion.div
                      key={generatedImage}
                      initial={{ opacity: 0, y: 40, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="relative group/img aspect-video rounded-3xl overflow-hidden border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-black/40 flex items-center justify-center shadow-2xl"
                    >
                      <img 
                        src={generatedImage} 
                        alt="Generated Asset" 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/img:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-6 backdrop-blur-sm">
                        <div className="transform translate-y-4 group-hover/img:translate-y-0 transition-transform duration-500">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2 text-center">Fidelity Verified</p>
                          <div className="flex gap-4">
                            <button 
                              onClick={handleDownload}
                              className="w-14 h-14 bg-white text-neutral-950 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-white/20 shadow-2xl group/dl"
                              title="Download Asset"
                            >
                              <Download className="w-6 h-6 group-hover/dl:animate-bounce" />
                            </button>
                            <button
                              onClick={handleUpscale}
                              disabled={isUpscaling}
                              className="w-14 h-14 bg-purple-500 text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-purple-500/20 shadow-2xl group/up disabled:opacity-50 disabled:cursor-wait"
                              title="Neural Upscale (4K Ultra)"
                            >
                              {isUpscaling ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                              ) : (
                                <Wand2 className="w-6 h-6 group-hover/up:rotate-12" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setGeneratedImage(null);
                                handleGenerate();
                              }}
                              className="w-14 h-14 bg-white/10 text-white border border-white/20 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all backdrop-blur-xl group/refresh"
                              title="Generate Variation"
                            >
                              <RefreshCw className="w-6 h-6 group-hover/refresh:rotate-180 transition-transform duration-700" />
                            </button>
                          </div>
                        </div>
                      </div>

                      
                      {/* Fidelity Badge */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                          Neural Master 4K
                        </div>
                        <div className="px-3 py-1 bg-indigo-500/80 backdrop-blur-md rounded-full border border-white/10 text-[8px] font-black text-white uppercase tracking-widest">
                          UHD Fidelity
                        </div>
                      </div>
                    </motion.div>
                  ) : isGenerating ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="aspect-video rounded-3xl bg-[#030308] flex flex-col items-center justify-center gap-6 overflow-hidden relative shadow-inner group"
                    >
                      {/* Neural Nebula Pulse Effect */}
                      <motion.div 
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [0.15, 0.3, 0.15],
                          rotate: [0, 90, 180, 270, 360]
                        }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 z-0"
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-conic from-indigo-500/20 via-purple-500/20 to-indigo-500/20 blur-[80px] rounded-full" />
                      </motion.div>

                      {/* Animated Neural Grid */}
                      <motion.div 
                        animate={{ 
                          opacity: [0.05, 0.1, 0.05],
                        }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 z-0"
                      >
                        <div className="absolute inset-0" style={{ 
                          backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', 
                          backgroundSize: '32px 32px' 
                        }} />
                      </motion.div>

                      {/* Holographic Scanning Line */}
                      <motion.div 
                        animate={{ 
                          top: ['-20%', '120%'],
                          opacity: [0, 1, 1, 0]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent z-10 shadow-[0_0_15px_rgba(79,70,229,0.8)]"
                      />
                      
                      <div className="relative isolate flex flex-col items-center">
                        <motion.div 
                          animate={{ 
                            rotate: 360,
                            scale: [1, 1.05, 1]
                          }}
                          transition={{ 
                            rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                            scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                          }}
                          className="w-32 h-32 border border-white/5 rounded-full flex items-center justify-center p-4 relative" 
                        >
                          {/* DNA-like orbit rings */}
                          <div className="absolute inset-0 border border-indigo-500/10 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                          <div className="absolute inset-2 border border-purple-500/10 rounded-full animate-pulse" />
                          
                          <Wand2 className="w-10 h-10 text-indigo-500/80 animate-pulse" />
                        </motion.div>
                        
                        {/* Core Energy Pulse */}
                        <motion.div 
                          animate={{ 
                            boxShadow: [
                              "0 0 20px rgba(79, 70, 229, 0.2)",
                              "0 0 60px rgba(79, 70, 229, 0.5)",
                              "0 0 20px rgba(79, 70, 229, 0.2)"
                            ]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute bottom-6 w-1 h-1 bg-white rounded-full translate-y-12" 
                        />
                      </div>

                      <div className="space-y-5 text-center relative z-20 w-full px-12">
                        <div className="space-y-1.5">
                          <AnimatePresence mode="wait">
                            <motion.p 
                              key={synthesisStage}
                              initial={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                              exit={{ opacity: 0, scale: 1.1, filter: 'blur(4px)' }}
                              transition={{ duration: 0.5 }}
                              className="text-white font-black uppercase tracking-[0.5em] text-[11px] h-4"
                            >
                              {synthesisStages[synthesisStage]}
                            </motion.p>
                          </AnimatePresence>
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                            <p className="text-neutral-500 text-[8px] font-black tracking-[0.3em] uppercase">Neural Synth Layer {synthesisStage + 1}</p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 items-center w-full max-w-xs mx-auto">
                          <div className="w-full h-1.5 bg-white/5 rounded-full relative overflow-hidden ring-1 ring-white/5 p-[1px]">
                            <motion.div 
                              animate={{ 
                                width: `${((synthesisStage + 1) / synthesisStages.length) * 100}%` 
                              }}
                              transition={{ duration: 1, ease: "anticipate" }}
                              className="relative h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                            >
                              {/* Liquid flow effect inside progress bar */}
                              <motion.div 
                                animate={{ x: ['-200%', '200%'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]"
                              />
                            </motion.div>
                          </div>
                          
                          <div className="flex justify-between w-full px-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1 h-1 bg-green-500 rounded-full animate-bounce" />
                              <span className="text-[7px] font-bold text-neutral-500 uppercase tracking-widest">{Math.round(((synthesisStage + 1) / synthesisStages.length) * 100)}% Synchronized</span>
                            </div>
                            <span className="text-[7px] font-bold text-neutral-500 uppercase tracking-widest">Active Latent Pass</span>
                          </div>
                        </div>

                        <div className="pt-2 opacity-40">
                          <motion.div 
                            animate={{ opacity: [0.3, 0.8, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="flex items-center justify-center gap-4"
                          >
                            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-neutral-500" />
                            <span className="text-neutral-500 text-[6px] font-black tracking-[0.5em] uppercase">Velora Neural Core 4.2.1</span>
                            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-neutral-500" />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="aspect-video rounded-3xl border-2 border-dashed border-neutral-200 dark:border-white/5 flex flex-col items-center justify-center gap-4 group/box transition-colors hover:border-indigo-500/20"
                    >
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ 
                          opacity: [0.3, 0.6, 0.3],
                          scale: [1, 1.05, 1],
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="w-16 h-16 rounded-[2rem] bg-neutral-100 dark:bg-white/5 flex items-center justify-center text-neutral-300 transition-colors group-hover/box:text-indigo-500 shadow-sm"
                      >
                        <ImageIcon className="w-8 h-8" />
                      </motion.div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 group-hover/box:text-neutral-500 transition-colors">Awaiting Input Vectors</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
