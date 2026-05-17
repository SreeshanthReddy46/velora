import React, { useState, useEffect, useRef } from 'react';
import { useStore } from './store/useStore';
import { cn, downloadImage } from './lib/utils';
import { 
  Send,
  Plus,
  Paperclip,
  Code2,
  Terminal,
  FileText,
  ChevronRight,
  Loader2,
  Search,
  Layout,
  Menu,
  X,
  Copy,
  Check,
  Upload,
  Info,
  AlertCircle,
  Settings,
  Trash2,
  MoreVertical,
  Clock,
  Pin,
  PinOff,
  User,
  LogOut,
  Cpu,
  Pencil,
  Wand2,
  Braces,
  Moon,
  Sun,
  Download,
  ShieldCheck,
  Smartphone,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { VeloraOrchestrator, VectorStore } from './services/vionService';
import { AgentType, FileNode, Chunk, UploadingFile, ChatSession, Message as MessageType } from './types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FirebaseProvider, useAuth } from './components/FirebaseProvider';
import { Login } from './components/Login';
import { ImageGenerator } from './components/ImageGenerator';
import { Onboarding } from './components/Onboarding';
import { auth, db } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const CodeViewer = ({ files, activeFile, setActiveFile, onClose }: { files: FileNode[], activeFile: string | null, setActiveFile: (f: string) => void, onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const findFile = (nodes: FileNode[], path: string): FileNode | undefined => {
    for (const node of nodes) {
      const currentPath = node.name;
      if (node.type === 'file' && (path === currentPath || path.endsWith('/' + currentPath))) {
        return node;
      }
      if (node.type === 'directory' && node.children) {
        const found = findFile(node.children, path);
        if (found) return found;
      }
    }
    return undefined;
  };

  const activeFileNode = activeFile ? findFile(files, activeFile) : undefined;

  const activeFileContent = activeFileNode?.content || "// No content available";

  const getLanguage = (filename: string | null) => {
    if (!filename) return 'typescript';
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx': return 'typescript';
      case 'js':
      case 'jsx': return 'javascript';
      case 'css': return 'css';
      case 'html': return 'html';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'py': return 'python';
      default: return 'typescript';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderFileList = (nodes: FileNode[], path = ''): React.ReactNode[] => {
    return nodes.map((node) => {
      const fullPath = path ? `${path}/${node.name}` : node.name;
      if (node.type === 'directory') return renderFileList(node.children || [], fullPath);
      const isActive = activeFile === fullPath;
      return (
        <div key={fullPath} className="group/file flex items-center gap-1">
          <button 
            onClick={() => setActiveFile(fullPath)}
            className={cn(
              "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all",
              isActive ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
            )}
          >
            <FileText className="w-3 h-3" />
            <span className="truncate">{node.name}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Are you sure you want to remove ${node.name}?`)) {
                useStore.getState().deleteFile(fullPath);
              }
            }}
            className="opacity-0 group-hover/file:opacity-100 p-1.5 hover:bg-red-500/10 text-neutral-500 hover:text-red-500 rounded-md transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      );
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-4 md:inset-10 z-50 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Code2 className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-sm font-semibold text-white">Project Workspace</h3>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
          <X className="w-5 h-5 text-neutral-400" />
        </button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 border-r border-neutral-800 bg-black/20 p-4 overflow-y-auto scrollbar-hide space-y-1">
          <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-4 px-3">Virtual Filesystem</p>
          {renderFileList(files)}
        </div>
        <div className="flex-1 overflow-auto scrollbar-hide bg-neutral-900/50 flex flex-col">
          <div className="sticky top-0 z-10 px-6 py-2 bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800/50 flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-tighter">{activeFile}</span>
            <div className="flex items-center gap-2">
              {activeFileNode?.mimeType?.startsWith('image/') && (
                <a 
                  href={activeFileNode.content} 
                  download={activeFileNode.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-600 transition-all text-[10px] font-bold uppercase"
                >
                  Download
                </a>
              )}
              <button 
                onClick={handleCopy}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300",
                  copied 
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" 
                    : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-600"
                )}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Copied!</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Copy Code</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            {activeFileNode?.mimeType?.startsWith('image/') ? (
              <div className="flex-1 flex items-center justify-center p-8 bg-neutral-950/50">
                <div className="relative group">
                  <img 
                    src={activeFileNode.content} 
                    alt={activeFileNode.name} 
                    className="max-w-full max-h-[70vh] rounded-xl shadow-2xl transition-transform group-hover:scale-[1.02]" 
                  />
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <p className="text-[10px] font-mono text-neutral-500 uppercase">{activeFileNode.mimeType}</p>
                  </div>
                </div>
              </div>
            ) : activeFileNode?.language === 'binary' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-neutral-950/50">
                <div className="w-20 h-20 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6 text-neutral-600">
                  <FileText className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">{activeFileNode.name}</h4>
                <p className="text-neutral-500 text-sm max-w-sm">
                  This file type is not supported for direct preview. You can still use it as context for the neural network.
                </p>
                <div className="mt-8 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                  {activeFileNode.mimeType || 'unknown binary'}
                </div>
              </div>
            ) : (
              <SyntaxHighlighter 
                language={getLanguage(activeFile)} 
                style={vscDarkPlus} 
                customStyle={{ margin: 0, padding: '2rem', backgroundColor: 'transparent', fontSize: '13px', flex: 1 }}
              >
                {activeFileContent}
              </SyntaxHighlighter>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const NeuralLoading = () => (
  <div className="flex flex-col items-start gap-4 py-6 px-4">
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 1, 0.3],
            backgroundColor: ['#3b82f6', '#8b5cf6', '#3b82f6']
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut"
          }}
          className="w-1.5 h-1.5 rounded-full"
        />
      ))}
      <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.2em] ml-2">Neural Link Synchronizing</span>
    </div>
    <div className="flex gap-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0.2 }}
          animate={{ 
            scaleY: [0.2, Math.random() * 0.8 + 0.2, 0.2],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.1
          }}
          className="w-1 h-3 bg-blue-500/50 rounded-full origin-bottom"
        />
      ))}
    </div>
  </div>
);

const MarkdownCodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const content = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="bg-neutral-800/50 px-1 py-0.5 rounded text-blue-400 text-xs font-mono" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group/code my-6 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/50">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-white transition-colors"
        >
          {copied ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5"
            >
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase">Copied!</span>
            </motion.div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Copy className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase">Copy</span>
            </div>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'typescript'}
        style={vscDarkPlus}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          backgroundColor: 'transparent',
          fontSize: '13px',
          lineHeight: '1.6'
        }}
        {...props}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

const TypewriterText = ({ text, isLatest, isProcessing }: { text: string, isLatest: boolean, isProcessing: boolean }) => {
  const [displayed, setDisplayed] = useState(isLatest ? "" : text);
  
  useEffect(() => {
    if (!isLatest) {
      setDisplayed(text);
      return;
    }

    if (displayed.length >= text.length) return;

    const timeout = setTimeout(() => {
      const diff = text.length - displayed.length;
      // Faster burst if we are lagging behind the stream
      const charsToAdd = diff > 30 ? 8 : (diff > 10 ? 3 : 1);
      setDisplayed(text.slice(0, displayed.length + charsToAdd));
    }, Math.random() * 12 + 4);

    return () => clearTimeout(timeout);
  }, [text, isLatest, displayed.length]);

  return (
    <div className="relative inline">
      <motion.div
        layout
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        className="inline prose prose-neutral dark:prose-invert"
      >
        <ReactMarkdown
          components={{
            code: MarkdownCodeBlock,
            p: ({ children }) => <div className="mb-4 last:mb-0">{children}</div>
          }}
        >
          {displayed}
        </ReactMarkdown>
      </motion.div>
      {isLatest && isProcessing && displayed.length < text.length && (
        <motion.span
          animate={{ 
            opacity: [1, 0, 1],
            scaleY: [1, 1.2, 1],
            backgroundColor: ['#3b82f6', '#60a5fa', '#3b82f6']
          }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block w-1 h-4 bg-blue-500 ml-1 translate-y-0.5 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
        />
      )}
    </div>
  );
};

const MessageCopyButton = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="md:absolute md:top-0 md:-right-12 md:opacity-0 group-hover/msg:opacity-100 p-2 bg-neutral-100 dark:bg-neutral-800 md:bg-transparent rounded-xl transition-all flex items-center gap-2 text-neutral-500 hover:text-white"
      title="Copy message"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 5 }}
            className="flex items-center gap-1.5"
          >
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Copied</span>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 5 }}
          >
            <Copy className="w-3.5 h-3.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};

const NotificationCenter = () => {
  const { notifications, removeNotification } = useStore();

  return (
    <div className="fixed top-20 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto min-w-[280px] bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-2xl flex items-start gap-3 group"
          >
            <div className={cn(
              "p-2 rounded-lg shrink-0",
              notif.type === 'success' ? "bg-emerald-500/10 text-emerald-500" :
              notif.type === 'error' ? "bg-red-500/10 text-red-500" :
              "bg-blue-500/10 text-blue-500"
            )}>
              {notif.type === 'success' ? <Check className="w-4 h-4" /> :
               notif.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
               <Info className="w-4 h-4" />}
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-sm text-white font-medium">{notif.message}</p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">Neural Confirmation</p>
            </div>
            <button 
              onClick={() => removeNotification(notif.id)}
              className="p-1 hover:bg-white/5 rounded-md text-neutral-600 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};


interface SessionItemProps {
  session: ChatSession;
  currentSessionId: string | null;
  isSidebarOpen: boolean;
  switchSession: (id: string) => void;
  togglePinSession: (id: string) => void;
  deleteSession: (id: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  windowWidth: number;
  isProcessing: boolean;
}

const SessionItem = ({ 
  session, 
  currentSessionId, 
  isSidebarOpen, 
  switchSession, 
  togglePinSession, 
  deleteSession,
  setIsSidebarOpen,
  windowWidth,
  isProcessing
}: SessionItemProps) => (
  <div 
    className={cn(
      "group flex items-center p-3 rounded-xl transition-all relative shrink-0",
      isProcessing ? "cursor-not-allowed opacity-50 bg-transparent" : "cursor-pointer",
      session.id === currentSessionId ? "bg-white dark:bg-white/5 text-neutral-900 dark:text-white shadow-lg border border-neutral-200 dark:border-transparent" : "text-neutral-500 hover:bg-neutral-200 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-neutral-300",
      isSidebarOpen ? "gap-4" : "justify-center"
    )}
    title={!isSidebarOpen ? (isProcessing ? "Processing..." : session.title) : ""}
    onClick={() => {
      if (isProcessing) return;
      switchSession(session.id);
      if (windowWidth < 1024) setIsSidebarOpen(false);
    }}
  >
    <FileText className="w-5 h-5 shrink-0" />
    {isSidebarOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex items-center justify-between min-w-0 pr-1 overflow-hidden"
      >
        <span className="text-xs truncate font-medium">{session.title}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all ml-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              togglePinSession(session.id);
            }}
            className={cn(
              "p-1.5 rounded-lg hover:bg-neutral-800 transition-all",
              session.isPinned ? "text-blue-500" : "text-neutral-500 hover:text-blue-400"
            )}
          >
            {session.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              deleteSession(session.id);
            }}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    )}
  </div>
);

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  createNewSession: () => void;
  switchSession: (id: string) => void;
  togglePinSession: (id: string) => void;
  deleteSession: (id: string) => void;
  setShowSettings: (show: boolean) => void;
  setShowProfile: (show: boolean) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  windowWidth: number;
  agentMode: 'vion' | 'pulse' | 'studio';
  setAgentMode: (mode: 'vion' | 'pulse' | 'studio') => void;
  isProcessing: boolean;
  creativeMode: boolean;
}

const Sidebar = ({
  sessions,
  currentSessionId,
  isSidebarOpen,
  setIsSidebarOpen,
  createNewSession,
  switchSession,
  togglePinSession,
  deleteSession,
  setShowSettings,
  setShowProfile,
  theme,
  setTheme,
  windowWidth,
  agentMode,
  setAgentMode,
  isProcessing,
  creativeMode
}: SidebarProps) => {
  const pinnedSessions = sessions.filter(s => s.isPinned);
  const recentSessions = sessions.filter(s => !s.isPinned);

  return (
    <div className="contents">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 280 : (windowWidth < 1024 ? 0 : 72),
          x: isSidebarOpen ? 0 : (windowWidth < 1024 ? -280 : 0)
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={cn(
          "h-screen bg-neutral-100 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col shrink-0 overflow-hidden relative z-50 shadow-[20px_0_40px_-20px_rgba(0,0,0,0.1)] dark:shadow-[20px_0_40px_-20px_rgba(0,0,0,0.5)] transition-colors duration-300",
          "fixed lg:relative top-0 left-0",
          !isSidebarOpen && "lg:items-center"
        )}
      >
        <div 
          className={cn(
            "p-4 flex flex-col gap-8 h-full transition-all duration-300 overflow-y-auto scrollbar-hide",
            isSidebarOpen ? "w-[280px]" : "w-[0px] lg:w-[72px] lg:items-center"
          )}
        >
        <div className={cn(
          "flex items-center gap-4 px-2 w-full transition-all duration-500", 
          !isSidebarOpen && "justify-center"
        )}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer relative group",
              creativeMode ? "bg-gradient-to-br from-indigo-500 to-purple-600" : "bg-neutral-900 dark:bg-white"
            )}
          >
            <AnimatePresence mode="wait">
              {creativeMode ? (
                <motion.div
                  key="studio"
                  initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                >
                  <Palette className="w-5 h-5 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="velora"
                  initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                  className="w-3 h-3 bg-white dark:bg-neutral-950 rounded-full"
                />
              )}
            </AnimatePresence>
            
            {/* Neural Pulse ring */}
            <div className={cn(
              "absolute inset-0 rounded-2xl border-2 border-indigo-500/30 dark:border-indigo-400/30 opacity-0 group-hover:opacity-100 transition-opacity",
              creativeMode && "animate-ping opacity-20"
            )} />
          </button>
          <AnimatePresence mode="popLayout">
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -10, filter: 'blur(8px)' }}
                className="flex flex-col"
              >
                <span className={cn(
                  "text-sm font-black whitespace-nowrap tracking-tighter transition-colors",
                  creativeMode || agentMode === 'studio' ? "text-indigo-500" : (agentMode === 'pulse' ? "text-purple-500" : "text-neutral-900 dark:text-white")
                )}>
                  {agentMode === 'studio' ? 'VELORA STUDIO' : agentMode === 'pulse' ? 'VELORA PULSE' : 'VELORA VION'}
                </span>
                <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-[0.2em] -mt-1">
                  {agentMode === 'studio' ? 'Gen-AI Pipeline' : agentMode === 'pulse' ? 'Deep Reasoning' : 'Neural Interface'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isSidebarOpen && (
          <div className="px-2 flex flex-col gap-1.5">
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-2 mb-1">
              Neural Mode
            </div>
            <div className="p-1.5 rounded-2xl bg-neutral-200/50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 flex flex-col gap-1 shadow-sm">
              <button 
                onClick={() => {
                  if (agentMode !== 'vion' && !isProcessing) {
                    setAgentMode('vion');
                    if (windowWidth < 1024) setIsSidebarOpen(false);
                  }
                }}
                disabled={isProcessing}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                  agentMode === 'vion' 
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-md" 
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-white"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", agentMode === 'vion' ? "bg-blue-500 animate-pulse" : "bg-neutral-400")} />
                VION: RAPID
              </button>
              <button 
                onClick={() => {
                  if (agentMode !== 'pulse' && !isProcessing) {
                    setAgentMode('pulse');
                    if (windowWidth < 1024) setIsSidebarOpen(false);
                  }
                }}
                disabled={isProcessing}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                  agentMode === 'pulse' 
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-md" 
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-white"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", agentMode === 'pulse' ? "bg-purple-500 animate-pulse" : "bg-neutral-400")} />
                PULSE: DEEP
              </button>
              <button 
                onClick={() => {
                  if (agentMode !== 'studio' && !isProcessing) {
                    setAgentMode('studio');
                    if (windowWidth < 1024) setIsSidebarOpen(false);
                  }
                }}
                disabled={isProcessing}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                  agentMode === 'studio' 
                    ? "bg-indigo-500 text-white shadow-md" 
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-white"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", agentMode === 'studio' ? "bg-indigo-300" : "bg-neutral-400")} />
                STUDIO: ASSET
              </button>
            </div>
          </div>
        )}

        <button 
          onClick={() => {
            if (isProcessing) return;
            createNewSession();
            if (window.innerWidth < 1024) setIsSidebarOpen(false);
          }}
          disabled={isProcessing}
          className={cn(
            "flex items-center p-3 rounded-xl transition-all border shrink-0 shadow-sm",
            isSidebarOpen ? "gap-4 w-full" : "justify-center w-12",
            isProcessing 
              ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 border-neutral-200 dark:border-neutral-800 cursor-not-allowed opacity-50"
              : "bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border-neutral-200 dark:border-neutral-700 group"
          )}
          title={!isSidebarOpen ? (isProcessing ? "Processing..." : "New Chat") : ""}
        >
          <Pencil className="w-5 h-5 shrink-0" />
          {isSidebarOpen && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-semibold whitespace-nowrap"
            >
              New Chat
            </motion.span>
          )}
        </button>

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-6 w-full">
          {(pinnedSessions.length > 0 || isSidebarOpen) && (
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest px-2 flex items-center gap-2 whitespace-nowrap"
                  >
                    <Pin className="w-3 h-3" />
                    Pinned
                  </motion.p>
                )}
              </AnimatePresence>
              {pinnedSessions.map((session) => (
                <SessionItem 
                  key={session.id} 
                  session={session} 
                  isSidebarOpen={isSidebarOpen}
                  currentSessionId={currentSessionId}
                  switchSession={switchSession}
                  togglePinSession={togglePinSession}
                  deleteSession={deleteSession}
                  setIsSidebarOpen={setIsSidebarOpen}
                  windowWidth={windowWidth}
                  isProcessing={isProcessing}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest px-2 whitespace-nowrap"
                >
                  Recent
                </motion.p>
              )}
            </AnimatePresence>
            {recentSessions.map((session) => (
              <SessionItem 
                key={session.id} 
                session={session} 
                isSidebarOpen={isSidebarOpen}
                currentSessionId={currentSessionId}
                switchSession={switchSession}
                togglePinSession={togglePinSession}
                deleteSession={deleteSession}
                setIsSidebarOpen={setIsSidebarOpen}
                windowWidth={windowWidth}
                isProcessing={isProcessing}
              />
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-col gap-2 w-full">
          <button 
            onClick={() => setShowProfile(true)}
            className={cn(
              "flex items-center rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all group shrink-0",
              isSidebarOpen ? "gap-4 p-3" : "justify-center p-3"
            )}
          >
            <User className="w-5 h-5 shrink-0" />
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-start min-w-0"
              >
                <span className="text-[11px] font-bold whitespace-nowrap">Profile</span>
                <span className="text-[9px] opacity-60 truncate w-32 tracking-wider uppercase">View & Edit</span>
              </motion.div>
            )}
          </button>
          
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={cn(
              "flex items-center rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all shrink-0 relative group/theme",
              isSidebarOpen ? "gap-4 p-3" : "justify-center p-3"
            )}
            title={isSidebarOpen ? "" : `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            <div className="relative w-5 h-5 shrink-0 flex items-center justify-center">
              <Sun className={cn(
                "w-5 h-5 absolute transition-all duration-500",
                theme === 'dark' ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
              )} />
              <Moon className={cn(
                "w-5 h-5 absolute transition-all duration-500",
                theme === 'light' ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
              )} />
            </div>
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs whitespace-nowrap font-medium"
              >
                {theme === 'dark' ? 'Light Appearance' : 'Dark Appearance'}
              </motion.span>
            )}
            {isSidebarOpen && (
              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/theme:opacity-100 transition-opacity">
                <span className="text-[10px] font-bold uppercase tracking-tighter text-neutral-400">
                  {theme === 'dark' ? 'Dark' : 'Light'}
                </span>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  theme === 'dark' ? "bg-indigo-500" : "bg-amber-500"
                )} />
              </div>
            )}
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className={cn(
              "flex items-center rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all shrink-0",
              isSidebarOpen ? "gap-4 p-3" : "justify-center p-3"
            )}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs whitespace-nowrap"
              >
                Settings
              </motion.span>
            )}
          </button>
        </div>
      </div>
    </motion.aside>
    </div>
  );
};

function AppContent() {
  const store = useStore();
  const { user, profile, loading, refreshProfile } = useAuth();

  const activeSession = store.sessions.find(s => s.id === store.currentSessionId) || store.sessions[0] || {
    messages: [],
    activities: [],
    files: [],
    chunks: [],
    id: ''
  };
  
  const { 
    messages, 
    activities,
    files,
    chunks,
  } = activeSession;

  const {
    addMessage, 
    updateLastMessage,
    isProcessing, 
    setProcessing, 
    updateFiles,
    setChunks,
    activeFile,
    setActiveFile,
    resetChat,
    addFile,
    addNotification,
    removeNotification,
    uploadingFiles,
    addUploadingFile,
    updateUploadingFile,
    removeUploadingFile,
    sessions,
    currentSessionId,
    createNewSession,
    switchSession,
    deleteSession,
    updateSessionTitle,
    togglePinSession,
    theme,
    setTheme,
    agentMode,
    setAgentMode,
    creativeMode,
    setCreativeMode
  } = store;

  // Sync theme to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const [inputValue, setInputValue] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isImageGenOpen, setIsImageGenOpen] = useState(false);

  const handleGenerateImage = async (prompt: string, options?: any) => {
    try {
      const res = await fetch('/api/media/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, options })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Neural sequence failed during image synthesis');
      }
      const data = await res.json();
      return data.imageUrl;
    } catch (err: any) {
      console.error('Image Generation Error:', err);
      throw err;
    }
  };

  const handleUpscaleImage = async (image: string) => {
    try {
      const res = await fetch('/api/media/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, factor: 2 })
      });
      if (!res.ok) throw new Error('Neural upscale sequence failed');
      const data = await res.json();
      return data.imageUrl;
    } catch (err: any) {
      console.error('Upscale Error:', err);
      throw err;
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    // Verify Internal Core Integrity
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'ok') {
          console.log('Vion Neural: Systems Nominal. Neural Agents synchronized.');
        }
      });

    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [editProfile, setEditProfile] = useState({ name: profile?.name || '', age: profile?.age || 0 });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllersRef = useRef<{ [key: string]: AbortController }>({});
  const generationAbortControllerRef = useRef<AbortController | null>(null);

  // Neural Autocorrect Map
  const AUTOCORRECT_MAP: { [key: string]: string } = {
    'teh': 'the',
    'reac': 'react',
    'reactjs': 'React',
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'funtion': 'function',
    'componant': 'component',
    'importent': 'important',
    'recieve': 'receive',
    'untill': 'until',
    'wich': 'which',
    'useing': 'using',
    'proformance': 'performance',
    'defualt': 'default',
    'librery': 'library',
    'virual': 'virtual',
    'dont': "don't",
    'cant': "can't",
    'wont': "won't",
    'didnt': "didn't",
    'hes': "he's",
    'shes': "she's",
    'its': "it's",
    'youre': "you're",
    'theyre': "they're",
    'weve': "we've",
    'id': "I'd",
    'im': "I'm",
  };

  const applyAutocorrect = (text: string) => {
    const words = text.split(' ');
    const lastWord = words[words.length - 1].toLowerCase();
    
    if (AUTOCORRECT_MAP[lastWord]) {
      words[words.length - 1] = AUTOCORRECT_MAP[lastWord];
      return words.join(' ');
    }
    return text;
  };

  const handleInputChange = (value: string) => {
    // Apply correction if the last character is a space
    if (value.endsWith(' ')) {
      const corrected = applyAutocorrect(value.trimEnd());
      setInputValue(corrected + ' ');
    } else {
      setInputValue(value);
    }
  };

  const exportSession = (format: 'json' | 'txt') => {
    const data = format === 'json' 
      ? JSON.stringify(activeSession, null, 2)
      : activeSession.messages.map(m => `[${m.role.toUpperCase()}] ${new Date(m.timestamp).toLocaleString()}\n${m.content}\n`).join('\n---\n');
    
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${activeSession.id}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addNotification({ type: 'success', message: `Neural data exported as ${format.toUpperCase()}` });
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        name: editProfile.name,
        age: Number(editProfile.age)
      });
      await refreshProfile();
      addNotification({ type: 'success', message: 'Neural Identity Updated' });
      setShowProfile(false);
    } catch (e) {
      console.error(e);
      addNotification({ type: 'error', message: 'Identity Sync Failed' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const [inactivityThreshold] = useState(1000 * 60 * 30); // 30 minutes
  const [lastActivity, setLastActivity] = useState(Number(localStorage.getItem('vion_last_activity') || Date.now()));

  // Inactivity Reload Logic
  useEffect(() => {
    const handleActivity = () => {
      const now = Date.now();
      setLastActivity(now);
      localStorage.setItem('vion_last_activity', now.toString());
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    const checkInactivity = setInterval(() => {
      const last = Number(localStorage.getItem('vion_last_activity') || Date.now());
      if (Date.now() - last > inactivityThreshold) {
        console.log("Inactivity threshold reached. Resetting session...");
        localStorage.setItem('vion_last_activity', Date.now().toString());
        localStorage.setItem('vion_force_new_session', 'true');
        window.location.reload();
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearInterval(checkInactivity);
    };
  }, [inactivityThreshold]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  const [dragActive, setDragActive] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(Date.now());

  // Auto-save timer every 60s
  useEffect(() => {
    const timer = setInterval(() => {
      setIsSyncing(true);
      // zustand persist handles the actual storage, 
      // but we mimic a cloud sync or a formal save pulse for UX
      setTimeout(() => {
        setIsSyncing(false);
        setLastSync(Date.now());
      }, 1000);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const handleRefine = async (content: string) => {
    if (isProcessing) return;
    const refinePrompt = `Review and refine the following generated code. 
Focus on:
1. Improved Readability: Clearer variable names and logical structure.
2. Best Practices: Modern coding patterns and idiomatic solutions.
3. Performance: Optimization for speed and resource usage.
4. Linting/Formatting: Perfect adherence to standard formatting rules.

Input Code:
${content}`;
    addMessage({ role: 'user', content: "✨ Refine this code for production standards." });
    runAgentLoop(refinePrompt);
  };

  const handleFileUpload = async (fileList: File[]) => {
    if (fileList.length === 0) return;
    
    // Limit to 50 files as requested
    const limitedFiles = fileList.slice(0, 50);
    if (fileList.length > 50) {
      addNotification({
        type: 'info',
        message: 'Batch limited to 50 files. Remaining files ignored.'
      });
    }

    const abortController = new AbortController();
    
    // Create individual upload placeholders for visibility
    const fileUploads = limitedFiles.map(file => {
      const uploadId = Math.random().toString(36).substring(7);
      abortControllersRef.current[uploadId] = abortController;
      
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      const uploadEntry: UploadingFile = {
        id: uploadId,
        name: file.name,
        progress: 0,
        status: 'uploading',
        type: file.type,
        preview: (isImage || isVideo) ? URL.createObjectURL(file) : undefined
      };
      addUploadingFile(uploadEntry);
      return { file, id: uploadId };
    });

    try {
      // 1. Read files (handle text, images, and other binary separately)
      const readResults = await Promise.all(fileUploads.map(async ({ file, id }) => {
        return new Promise<{ node: FileNode, id: string, isBinary: boolean }>((resolve) => {
          const isText = file.type.startsWith('text/') || 
                         file.name.match(/\.(ts|tsx|js|jsx|json|md|css|html|py|sql|yaml|yml)$/i);
          const isImage = file.type.startsWith('image/');
          
          if (isText) {
            const reader = new FileReader();
            reader.onprogress = (e) => {
              if (e.lengthComputable) {
                const progress = Math.round((e.loaded / e.total) * 40);
                updateUploadingFile(id, { progress });
              }
            };
            reader.onload = (event) => {
              const content = event.target?.result as string;
              const node: FileNode = {
                name: file.name,
                type: 'file',
                content,
                language: file.name.split('.').pop() || 'text',
                mimeType: file.type || 'text/plain'
              };
              updateUploadingFile(id, { status: 'indexing', progress: 40 });
              resolve({ node, id, isBinary: false });
            };
            reader.readAsText(file);
          } else if (isImage) {
            const reader = new FileReader();
            reader.onprogress = (e) => {
              if (e.lengthComputable) {
                const progress = Math.round((e.loaded / e.total) * 40);
                updateUploadingFile(id, { progress });
              }
            };
            reader.onload = (event) => {
              const content = event.target?.result as string;
              const node: FileNode = {
                name: file.name,
                type: 'file',
                content,
                language: 'image',
                mimeType: file.type
              };
              updateUploadingFile(id, { status: 'complete', progress: 100 });
              resolve({ node, id, isBinary: true });
            };
            reader.readAsDataURL(file);
          } else {
            // Other binary files
            setTimeout(() => {
              const node: FileNode = {
                name: file.name,
                type: 'file',
                content: `[FILE: ${file.name} - ${file.type || 'unknown type'} - ${Math.round(file.size / 1024)}KB]`,
                language: 'binary',
                mimeType: file.type
              };
              updateUploadingFile(id, { status: 'complete', progress: 100 });
              resolve({ node, id, isBinary: true });
            }, 800);
          }
        });
      }));

      if (abortController.signal.aborted) return;

      const nodes = readResults.map(r => r.node);
      const textNodes = readResults.filter(r => !r.isBinary).map(r => r.node);
      
      nodes.forEach(node => addFile(node));

      // 2. Batch Indexing for text nodes
      if (textNodes.length > 0) {
        await indexFiles(
          textNodes,
          true,
          (p) => {
            readResults.filter(r => !r.isBinary).forEach(({ id }) => {
              updateUploadingFile(id, { progress: 40 + (p * 0.6) });
            });
          },
          abortController.signal
        );
      }

      if (abortController.signal.aborted) return;

      // 3. Complete all
      readResults.forEach(({ id, node }) => {
        updateUploadingFile(id, { status: 'complete', progress: 100 });
        
        const notifId = Math.random().toString(36).substring(7);
        addNotification({ 
          id: notifId,
          type: 'success', 
          message: `Linked: ${node.name}` 
        });
        setTimeout(() => removeNotification(notifId), 5000);
        // Removed auto-removal to keep items in the input area
      });

      const binaryCount = readResults.filter(r => r.isBinary).length;
      const textCount = textNodes.length;

      addMessage({ 
        role: 'system', 
        content: `Neural connection established. Synced ${textCount} technical documents and recognized ${binaryCount} multimedia artifacts.` 
      });

    } catch (error) {
      console.error("Batch upload failed", error);
      const err = error as Error;
      addNotification({ 
        type: 'error', 
        message: `Upload failed: ${err.message || 'Something went wrong.'}` 
      });
    }
  };

  const cancelUpload = (id: string) => {
    if (abortControllersRef.current[id]) {
      abortControllersRef.current[id].abort();
      removeUploadingFile(id);
      delete abortControllersRef.current[id];
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(Array.from(e.dataTransfer.files));
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (files.length > 0 && chunks.length === 0) {
      indexFiles(files);
    }
  }, []);

  const indexFiles = async (filesToIndex: FileNode[], append = false, onProgress?: (p: number) => void, signal?: AbortSignal) => {
    const flatten = (nodes: FileNode[], path = ''): { name: string, content: string, path: string }[] => {
      let results: { name: string, content: string, path: string }[] = [];
      nodes.forEach(node => {
        const fullPath = path ? `${path}/${node.name}` : node.name;
        if (node.type === 'file' && node.content) {
          results.push({ name: node.name, content: node.content, path: fullPath });
        } else if (node.type === 'directory' && node.children) {
          results = [...results, ...flatten(node.children, fullPath)];
        }
      });
      return results;
    };

    try {
      const flat = flatten(filesToIndex);
      const pendingChunks: { text: string; file: any }[] = [];

      for (const file of flat) {
        if (signal?.aborted) return;
        const lines = file.content.split('\n');
        for (let i = 0; i < lines.length; i += 6) {
          const text = lines.slice(i, i + 12).join('\n');
          if (text.trim().length < 40) continue;
          pendingChunks.push({ text, file });
        }
      }

      if (pendingChunks.length === 0) return;

      const batchSize = 10; // Process in smaller batches to report progress
      const totalBatches = Math.ceil(pendingChunks.length / batchSize);
      const allNewChunks: Chunk[] = [];

      for (let i = 0; i < pendingChunks.length; i += batchSize) {
        if (signal?.aborted) return;
        
        const batch = pendingChunks.slice(i, i + batchSize);
        const embeddings = await VectorStore.getEmbeddingsBatch(batch.map(c => c.text));
        
        const batchChunks: Chunk[] = batch.map((c, j) => ({
          id: Math.random().toString(36).substring(7),
          fileId: c.file.path,
          text: c.text,
          embedding: embeddings[j],
          metadata: { fileName: c.file.name, path: c.file.path }
        }));

        allNewChunks.push(...batchChunks);
        
        if (onProgress) {
          const progress = Math.min(100, Math.round(((i + batch.length) / pendingChunks.length) * 100));
          onProgress(progress);
        }
      }
      
      if (append) {
        setChunks([...chunks, ...allNewChunks]);
      } else {
        setChunks(allNewChunks);
      }
      
      VectorStore.syncToPinecone(allNewChunks);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        console.log("Indexing aborted");
      } else {
        console.error("Index sync error", e);
        const error = e as Error;
        addNotification({ 
          type: 'error', 
          message: `Index error: ${error.message || 'Please check your connection.'}` 
        });
      }
    }
  };

  const [steps, setSteps] = useState<{label: string, status: 'doing' | 'done' | 'error'}[]>([]);

  const runAgentLoop = async (prompt: string, retryCount = 0) => {
    if (generationAbortControllerRef.current) {
      generationAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    generationAbortControllerRef.current = abortController;

    setProcessing(true);
    setSteps([
      { label: `Neural Synapse Initialization (${agentMode === 'pulse' ? 'Deep' : 'Rapid'})`, status: 'doing' },
    ]);

    try {
      // Internal neural computation for contextual relevance
      if (agentMode === 'pulse') {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 800);
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Generation cancelled by operator.'));
          });
        });
      }

      const [queryEmbedding] = await Promise.all([
        VectorStore.getEmbeddings(prompt),
        new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 300);
          abortController.signal.addEventListener('abort', () => {
             clearTimeout(timeout);
             reject(new Error('Generation cancelled by operator.'));
          });
        })
      ]);

      setSteps(s => [
        { label: `Neural Synapse Initialization (${agentMode === 'pulse' ? 'Deep' : 'Rapid'})`, status: 'done' },
        { label: agentMode === 'pulse' ? 'Deep Semantic Pattern Extraction' : 'BM25 Hybrid Pattern Matching', status: 'doing' }
      ]);

      const contextK = agentMode === 'pulse' ? 25 : 15;
      const relevantContext = await VectorStore.findRelevantContext(prompt, queryEmbedding, chunks, contextK);
      
      setSteps(s => [
        { label: `Neural Synapse Initialization (${agentMode === 'pulse' ? 'Deep' : 'Rapid'})`, status: 'done' },
        { label: agentMode === 'pulse' ? 'Deep Semantic Pattern Extraction' : 'BM25 Hybrid Pattern Matching', status: 'done' },
        { label: `Autonomous Agent Reasoning (Velora Core - ${agentMode.toUpperCase()})`, status: 'doing' }
      ]);

      if (agentMode === 'pulse') {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 1200);
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Generation cancelled by operator.'));
          });
        });
      }

      let fullContent = "";
      addMessage({ role: 'assistant', content: "", agent: agentMode === 'pulse' ? 'researcher' : 'planner' });
      
      const generator = VeloraOrchestrator.streamExecution(
        prompt, 
        agentMode === 'pulse' ? 'researcher' : 'coder', 
        messages, 
        relevantContext, 
        profile?.name,
        abortController.signal
      );
      
      for await (const segment of generator) {
        if (abortController.signal.aborted) throw new Error('Generation cancelled by operator.');
        fullContent += segment;
        updateLastMessage(fullContent);
      }

      // Memory indexing for session continuity in background
      const historyChunks: Chunk[] = [
        {
          id: `msg_u_${Date.now()}`,
          fileId: 'chat_history',
          text: `USER: ${prompt}`,
          metadata: { fileName: 'Conversation History', path: 'chat_history', type: 'history' }
        },
        {
          id: `msg_a_${Date.now()}`,
          fileId: 'chat_history',
          text: `VION: ${fullContent}`,
          metadata: { fileName: 'Conversation History', path: 'chat_history', type: 'history' }
        }
      ];

      if (messages.length <= 2) {
        VeloraOrchestrator.generateTitle([...messages, { role: 'user', content: prompt }, { role: 'assistant', content: fullContent }])
          .then(newTitle => {
            if (newTitle) updateSessionTitle(currentSessionId, newTitle);
          })
          .catch(err => console.warn("Title sync jitter", err));
      }

      VectorStore.getEmbeddingsBatch(historyChunks.map(c => c.text)).then(embeddings => {
        const enriched = historyChunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
        setChunks([...chunks, ...enriched]);
      });

      setSteps(s => [
        { label: `Neural Synapse Initialization (${agentMode === 'pulse' ? 'Deep' : 'Rapid'})`, status: 'done' },
        { label: agentMode === 'pulse' ? 'Deep Semantic Pattern Extraction' : 'BM25 Hybrid Pattern Matching', status: 'done' },
        { label: `Autonomous Agent Reasoning (Velora Core - ${agentMode.toUpperCase()})`, status: 'done' },
        { label: 'Multi-Agent Code Synthesis', status: 'doing' }
      ]);

      const jsonMatch = fullContent.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.filesUpdated) {
            updateFiles(parsed.filesUpdated);
            indexFiles(parsed.filesUpdated);
            const hasAppTsx = parsed.filesUpdated.some((f: any) => f.name === 'App.tsx');
            if (hasAppTsx) setActiveFile('src/App.tsx');
          }
        } catch (e) {
             console.warn("Synthesis interrupted", e);
        }
      }
      
      setSteps(s => s.map(st => ({ ...st, status: 'done' })));

    } catch (error: any) {
      if (error.name === 'AbortError' || error.message === 'Generation cancelled by operator.') {
        addMessage({ role: 'system', content: 'Neural sequence terminated by operator.' });
      } else if (retryCount < 2) {
        addMessage({ role: 'system', content: `Neural jitter detected. Attempting sequence recovery (${retryCount + 1}/2)...` });
        return runAgentLoop(prompt, retryCount + 1);
      } else {
        console.error(error);
        addMessage({ role: 'system', content: 'Connection lost. Please check your network and try again.' });
        addNotification({ 
          type: 'error', 
          message: `Oops! ${error.message || 'Something went wrong'}. Please try again.` 
        });
        setSteps(s => s.map(st => st.status === 'doing' ? { ...st, status: 'error' } : st));
      }
    } finally {
      if (generationAbortControllerRef.current === abortController) {
        setProcessing(false);
        generationAbortControllerRef.current = null;
        setTimeout(() => setSteps([]), 2000);
      }
    }
  };

  // Sync editProfile when actual profile loads
  useEffect(() => {
    if (profile) {
      setEditProfile({ name: profile.name || '', age: profile.age || 0 });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const prompt = inputValue;
    setInputValue('');
    
    // Clear uploaded files from input view on submit
    uploadingFiles.forEach(f => {
      if (f.status === 'complete') removeUploadingFile(f.id);
    });

    addMessage({ role: 'user', content: prompt });

    if (agentMode === 'studio') {
      setProcessing(true);
      setCreativeMode(true);
      setSteps([
        { label: 'Neural Resolution Initialization', status: 'done' },
        { label: '4K UHD Synthetic Rendering', status: 'doing' }
      ]);

      try {
        const imageUrl = await handleGenerateImage(prompt);
        const assistantContent = `Neural Asset synthesized at 4K UHD resolution: "${prompt}" successfully rendered into production-grade neural asset.`;
        addMessage({ 
          role: 'assistant', 
          content: assistantContent,
          imageUrl 
        });
        
        // Auto-rename session if first message
        if (messages.length <= 1) {
          VeloraOrchestrator.generateTitle([
            { role: 'user', content: prompt },
            { role: 'assistant', content: assistantContent }
          ]).then(newTitle => {
            if (newTitle) updateSessionTitle(currentSessionId, newTitle);
          });
        }

        addNotification({ type: 'success', message: 'Neural Asset Synthesized Successfully' });
      } catch (err: any) {
        addMessage({ role: 'assistant', content: `Neural link disruption: ${err.message}` });
        addNotification({ type: 'error', message: 'Synthesis Disrupt' });
      } finally {
        setProcessing(false);
        setSteps(s => s.map(st => ({ ...st, status: 'done' })));
        setTimeout(() => {
          setSteps([]);
          setCreativeMode(false);
        }, 2000);
      }
      return;
    }

    runAgentLoop(prompt);
  };

  useEffect(() => {
    const forceNew = localStorage.getItem('vion_force_new_session');
    if (forceNew === 'true') {
      localStorage.removeItem('vion_force_new_session');
      createNewSession();
    }
  }, []);

  return (
    <div 
      className={cn(
        "h-screen w-full text-neutral-900 dark:text-neutral-200 flex font-sans overflow-hidden transition-all duration-300 relative",
        creativeMode 
          ? "bg-slate-50 dark:bg-[#02020a] selection:bg-indigo-500/30" 
          : "bg-neutral-50 dark:bg-neutral-950"
      )}
      onDragEnter={onDrag}
    >
      {/* Background Creative Glows */}
      <AnimatePresence>
        {creativeMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
          >
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          </motion.div>
        )}
      </AnimatePresence>
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        createNewSession={createNewSession}
        switchSession={switchSession}
        togglePinSession={togglePinSession}
        deleteSession={deleteSession}
        setShowSettings={setShowSettings}
        setShowProfile={setShowProfile}
        theme={theme}
        setTheme={setTheme}
        windowWidth={windowWidth}
        agentMode={agentMode}
        setAgentMode={(mode) => {
          if (isProcessing) return;
          setAgentMode(mode);
          resetChat();
        }}
        isProcessing={isProcessing}
        creativeMode={creativeMode}
      />
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <AnimatePresence>
          {dragActive && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDragLeave={onDrag}
              onDragOver={onDrag}
              onDrop={onDrop}
              className="absolute inset-0 z-[100] bg-blue-500/10 backdrop-blur-sm border-2 border-dashed border-blue-500/50 m-4 rounded-3xl flex items-center justify-center pointer-events-auto"
            >
              <div className="flex flex-col items-center gap-4 text-blue-500 bg-neutral-950 p-12 rounded-3xl border border-blue-500/20 shadow-2xl">
                <Upload className="w-12 h-12 animate-bounce" />
                <div className="text-center">
                  <p className="text-xl font-bold uppercase tracking-widest">Deploy Artifacts</p>
                  <p className="text-sm font-mono opacity-60">Drop multiple files (up to 50) for batch indexing</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="h-16 shrink-0 border-b border-neutral-200 dark:border-neutral-800/50 flex items-center justify-between px-4 md:px-6 backdrop-blur-md bg-white/50 dark:bg-neutral-950/50 sticky top-0 z-40 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <Menu className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
          <div className="hidden sm:flex w-8 h-8 rounded-xl bg-neutral-900 dark:bg-white items-center justify-center">
            <div className="w-3 h-3 bg-white dark:bg-neutral-950 rounded-full" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-sm font-bold tracking-widest text-neutral-900 dark:text-white leading-tight uppercase truncate max-w-[120px] sm:max-w-none">
              {agentMode === 'vion' ? 'Velora Neural v1.0' : agentMode === 'pulse' ? 'Pulse Deep Search v1.0' : 'Velora Studio v1.0'}
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[7px] sm:text-[8px] font-bold text-emerald-500/80 uppercase tracking-widest hidden xs:inline">Active</span>
              </div>
              <div className="flex items-center gap-1 group/core relative">
                <Cpu className="w-2 sm:w-2.5 h-2 sm:h-2.5 text-blue-500" />
                <span className="text-[7px] sm:text-[8px] font-bold text-blue-500/80 uppercase tracking-widest">
                  {agentMode === 'vion' ? 'Core 1.0' : agentMode === 'pulse' ? 'Pulse 1.0' : 'Studio 1.0'}
                </span>
              </div>
              <div className="flex items-center gap-1 group/security relative cursor-help">
                <ShieldCheck className="w-2 sm:w-2.5 h-2 sm:h-2.5 text-emerald-500" />
                <span className="text-[7px] sm:text-[8px] font-bold text-emerald-500/80 uppercase tracking-widest">Basic Guard</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-[10px] text-neutral-400 whitespace-nowrap opacity-0 group-hover/security:opacity-100 transition-all pointer-events-none z-50 shadow-xl">
                  Standard Neural Encryption • Essential Data Protection
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative group/export hidden xs:block">
            <button 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Export</span>
            </button>
            <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover/export:opacity-100 group-hover/export:translate-y-0 group-hover/export:pointer-events-auto transition-all z-50 overflow-hidden">
              <button 
                onClick={() => exportSession('json')}
                className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-all"
              >
                JSON Data
              </button>
              <button 
                onClick={() => exportSession('txt')}
                className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-all border-t border-neutral-100 dark:border-neutral-800"
              >
                Text Log
              </button>
            </div>
          </div>
          <button 
            onClick={resetChat}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden md:inline">New Session</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden group/avatar relative">
            <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'user'}`} alt="User" referrerPolicy="no-referrer" />
            <button 
              onClick={() => signOut(auth)}
              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
            >
              <LogOut className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto scrollbar-hide flex flex-col items-center relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={agentMode}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-0 z-30 w-full flex justify-center p-2"
          >
            <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 px-4 py-1.5 rounded-full shadow-sm flex items-center gap-3">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                agentMode === 'vion' ? "bg-blue-500" : "bg-purple-500"
              )} />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                {agentMode === 'vion' ? 'Velora High-Speed Neural Active' : 'Pulse Deep Semantic Analysis Active'}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="w-full max-w-3xl flex flex-col flex-1 px-4 py-8 md:py-12 space-y-12">
          <AnimatePresence mode="wait">
            {!inputValue && messages.length === 0 && (
              <motion.div 
                key={agentMode + (creativeMode ? '-creative' : '')}
                initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -40, filter: 'blur(10px)' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center justify-center flex-1 text-center py-20 px-6"
              >
                <motion.div 
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
                  className={cn(
                    "w-20 h-20 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl relative group/logo transition-all duration-700",
                    creativeMode 
                      ? "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rotate-12 scale-110 shadow-indigo-500/50" 
                      : (agentMode === 'vion' ? "bg-neutral-900 dark:bg-white" : "bg-neutral-900 dark:bg-purple-600")
                  )}
                >
                  <div className={cn(
                    "absolute inset-0 rounded-[2.5rem] blur-xl opacity-0 group-hover/logo:opacity-20 transition-opacity",
                    creativeMode ? "opacity-60 bg-indigo-400 blur-2xl animate-pulse" : (agentMode === 'vion' ? "bg-blue-500" : "bg-purple-400")
                  )} />
                  {creativeMode ? (
                    <Palette className="w-10 h-10 text-white" />
                  ) : agentMode === 'vion' ? (
                    <Cpu className="w-10 h-10 text-white dark:text-neutral-900" />
                  ) : (
                    <Search className="w-10 h-10 text-white" />
                  )}
                </motion.div>

                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={cn(
                    "text-4xl sm:text-6xl font-black text-neutral-900 dark:text-white mb-6 tracking-tighter transition-all duration-700",
                    (creativeMode || agentMode === 'studio') && "text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 drop-shadow-sm"
                  )}
                >
                  {agentMode === 'studio' ? 'Velora Studio' : agentMode === 'pulse' ? 'Welcome to Pulse' : 'Welcome to Vion'}
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-neutral-500 dark:text-neutral-400 text-base sm:text-lg max-w-lg leading-relaxed"
                >
                  {agentMode === 'studio'
                    ? 'State-of-the-art neural image synthesis. Generate high-fidelity realistic placeholders and studio-grade assets with perfect precision. ✨'
                    : agentMode === 'pulse'
                    ? 'Advanced cognitive reasoning for deep technical research. I can iterate through complex systems and provide holistic architectural insights.'
                    : 'How can I help you build today? I have a specialized multi-agent system ready to plan, research, and code your project.'}
                </motion.p>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-12 flex flex-wrap justify-center gap-3"
                >
                  <div className={cn(
                    "px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400 transition-all",
                    creativeMode && "bg-indigo-500/10 border-indigo-500/20 text-indigo-500 shadow-sm shadow-indigo-500/20"
                  )}>
                    {creativeMode ? 'Neural Synthesis' : (agentMode === 'vion' ? 'Rapid Execution' : 'Deep Reasoning')}
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400 transition-all",
                    creativeMode && "bg-purple-500/10 border-purple-500/20 text-purple-500 shadow-sm shadow-purple-500/20"
                  )}>
                    {creativeMode ? 'Perfect Fidelity' : (agentMode === 'vion' ? 'Neural Synthesis' : 'Semantic Indexing')}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {messages.map((msg, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.4, delay: 0.1 }}
                    key={msg.id} 
                    className={cn("group flex flex-col gap-3", msg.role === 'user' ? "items-end" : "items-start")}
                  >
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                        {msg.role === 'user' ? 'Operator' : msg.role === 'system' ? 'System Bulletin' : (agentMode === 'vion' ? 'Velora Core' : 'Pulse Core')}
                      </span>
                    </div>
                    <div className={cn(
                      "transition-all duration-300 relative",
                      msg.role === 'user' 
                        ? "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/50 max-w-[85%] md:max-w-[70%] w-fit ml-auto shadow-sm dark:shadow-none px-4 py-2.5 md:px-5 md:py-3 rounded-[1.25rem] md:rounded-[1.5rem] !inline-flex flex-col" 
                        : msg.role === 'system'
                        ? "bg-blue-500/5 border border-blue-500/20 max-w-none py-4 px-6 italic text-blue-600 dark:text-blue-400/80 text-sm rounded-2xl md:rounded-3xl w-full"
                        : "bg-transparent border-none max-w-none px-0 py-0 w-full"
                    )}>
                      <div className="markdown-body relative w-fit">
                        {msg.role === 'system' ? (
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span>{msg.content}</span>
                          </div>
                        ) : (
                          <div className="relative group/msg w-fit block">
                            <TypewriterText 
                              text={msg.content} 
                              isLatest={isProcessing && idx === messages.length - 1} 
                              isProcessing={isProcessing}
                            />
                            {msg.imageUrl && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-4 rounded-3xl overflow-hidden border border-neutral-200 dark:border-white/10 shadow-2xl relative group/img"
                              >
                                <img 
                                  src={msg.imageUrl} 
                                  alt="Synthesized Neural Asset" 
                                  className="w-full h-auto max-h-[500px] object-cover transition-transform duration-700 group-hover/img:scale-105"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                                  <button 
                                    onClick={() => downloadImage(msg.imageUrl!, `synapse-asset-${Date.now()}.png`)}
                                    className="p-4 bg-white text-neutral-950 rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl font-bold flex items-center gap-2"
                                  >
                                    <Download className="w-5 h-5" />
                                    <span>Download Asset</span>
                                  </button>
                                </div>
                              </motion.div>
                            )}
                            {!(isProcessing && idx === messages.length - 1) && (
                              <div className="flex md:absolute items-center gap-2 mt-4 md:mt-0 md:top-0 md:right-[-48px] md:h-full md:flex-col">
                                <MessageCopyButton content={msg.content} />
                                {msg.role === 'assistant' && (
                                  <button
                                    onClick={() => handleRefine(msg.content)}
                                    className="md:opacity-0 group-hover/msg:opacity-100 p-2 bg-neutral-100 dark:bg-neutral-800 md:bg-transparent rounded-xl transition-all flex items-center gap-2 text-neutral-500 hover:text-white"
                                    title="Neural Refinement: Optimize for production"
                                  >
                                    <Wand2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
          
          {isProcessing && !messages[messages.length - 1]?.content && (
            <div className="w-full flex justify-start">
              <NeuralLoading />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Input Section */}
      <div className="w-full shrink-0 flex flex-col items-center p-4 md:p-6 bg-gradient-to-t from-neutral-50 dark:from-neutral-950 via-neutral-50 dark:via-neutral-950 to-transparent sticky bottom-0 z-40">
        <div className="w-full max-w-3xl relative">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur opacity-10 group-focus-within:opacity-30 transition-opacity duration-500" />
            <div className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-xl focus-within:border-blue-500/50 dark:focus-within:border-neutral-700 transition-all flex flex-col">
              {uploadingFiles.length > 0 && (
                <div className="px-4 py-3 flex flex-wrap gap-3 max-h-48 overflow-y-auto scrollbar-hide border-b border-neutral-100 dark:border-neutral-800">
                  <AnimatePresence>
                    {uploadingFiles.map(file => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        key={file.id}
                        className={cn(
                          "relative group/file w-24 h-24 rounded-2xl border flex flex-col items-center justify-center p-2 transition-all",
                          file.status === 'error' ? "border-red-500/50 bg-red-500/5" :
                          file.status === 'complete' ? "border-emerald-500/30 bg-emerald-500/5" : 
                          "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50"
                        )}
                      >
                        {file.preview ? (
                          <div className="absolute inset-0 p-1">
                            {file.type?.startsWith('video/') ? (
                               <div className="w-full h-full rounded-xl bg-neutral-800 flex items-center justify-center">
                                 <Smartphone className="w-6 h-6 text-neutral-500" />
                               </div>
                            ) : (
                               <img src={file.preview} alt={file.name} className="w-full h-full object-cover rounded-xl" />
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <FileText className="w-6 h-6 text-neutral-400" />
                            <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-tighter max-w-[80%] truncate">{file.name.split('.').pop()}</span>
                          </div>
                        )}
                        
                        {/* Overlay Controls */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/file:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center gap-2">
                           <button 
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               cancelUpload(file.id);
                             }}
                             className="p-1.5 bg-red-500 rounded-lg text-white hover:scale-110 transition-all"
                           >
                              <Trash2 className="w-3 h-3" />
                           </button>
                        </div>

                        {/* Progress Bar */}
                        {file.status !== 'complete' && file.status !== 'error' && (
                          <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1">
                             <div className="h-1 bg-black/20 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${file.progress}%` }}
                                  className="h-full bg-blue-500"
                                />
                             </div>
                             <span className="text-[7px] text-white font-bold text-center drop-shadow-md">{Math.round(file.progress)}%</span>
                          </div>
                        )}

                        {file.status === 'complete' && (
                          <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-lg">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
              <textarea 
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                spellCheck={true}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={agentMode === 'vion' ? "Ask Velora for a fast answer..." : (agentMode === 'pulse' ? "Describe a complex task for Pulse deep search..." : "Describe the image you want to synthesize...")} 
                className="w-full bg-transparent px-6 py-4 md:py-5 pl-14 pr-16 sm:pr-52 outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 resize-none text-[15px] scrollbar-hide max-h-[200px] relative z-10"
              />
              {inputValue && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
                >
                   <motion.div 
                     animate={{ 
                       x: ['-100%', '100%'],
                     }}
                     transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                     className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent skew-x-12"
                   />
                </motion.div>
              )}
              <div className="absolute left-3 bottom-1.5 md:bottom-2.5 z-50 overflow-visible">
                <AnimatePresence>
                  {showAttachmentMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 bottom-full mb-3 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden z-[100] origin-bottom-left"
                    >
                      <div className="p-2 space-y-1">
                        <button 
                          type="button"
                          onClick={() => {
                            fileInputRef.current?.click();
                            setShowAttachmentMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors text-left group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-900 dark:text-white">Upload Batch</p>
                            <p className="text-[10px] text-neutral-500 font-medium">Attach multiple resources</p>
                          </div>
                        </button>

                        <button 
                          type="button"
                          onClick={() => {
                            setAgentMode('studio');
                            setShowAttachmentMenu(false);
                            setTimeout(() => textareaRef.current?.focus(), 100);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors text-left group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                            <Wand2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-900 dark:text-white">Studio</p>
                            <p className="text-[10px] text-neutral-500 font-medium tracking-tight">Neural Image Synthesis</p>
                          </div>
                        </button>

                        <button 
                          type="button"
                          onClick={() => {
                            setInputValue(v => v + (v ? "\n" : "") + "```typescript\n\n```");
                            setShowAttachmentMenu(false);
                            setTimeout(() => textareaRef.current?.focus(), 100);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors text-left group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                            <Braces className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-900 dark:text-white">Snippet</p>
                            <p className="text-[10px] text-neutral-500 font-medium tracking-tight">Insert code structure</p>
                          </div>
                        </button>

                        <div className="px-3 py-3 border-t border-neutral-100 dark:border-neutral-800">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500/20 transition-all">
                              <Search className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-neutral-900 dark:text-white">Neural Cache</p>
                              <p className="text-[10px] text-neutral-500 font-medium tracking-tight">{chunks.length} Context Chunks Indexed</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAttachmentMenu(prev => !prev);
                  }}
                  className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-xl relative z-[110]",
                    showAttachmentMenu 
                      ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 scale-110" 
                      : (creativeMode 
                          ? "bg-indigo-500 text-white shadow-indigo-500/20 shadow-lg" 
                          : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-white border border-neutral-200 dark:border-neutral-700")
                  )}
                  title="Neural Resources & Assets"
                >
                  <Plus className={cn("w-5 h-5 transition-transform duration-500 ease-out", showAttachmentMenu && "rotate-[135deg]")} />
                </button>
              </div>

              <div className="absolute right-3 bottom-1.5 md:bottom-2.5 flex items-center gap-2 z-50">
                <AnimatePresence>
                  {agentMode === 'studio' && (
                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      type="button"
                      onClick={() => {
                        setIsImageGenOpen(true);
                      }}
                      className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center hover:scale-110 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                      title="Studio: Neural Image Synthesis"
                    >
                      <Wand2 className="w-5 h-5 shadow-sm" />
                    </motion.button>
                  )}
                </AnimatePresence>
                <div className={cn(
                  "hidden sm:flex items-center p-1 rounded-2xl relative overflow-hidden transition-all duration-500 border",
                  agentMode === 'studio' || creativeMode 
                    ? "bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_20px_-5px_rgba(99,102,241,0.2)]" 
                    : "bg-neutral-100 dark:bg-neutral-800 border-transparent shadow-sm"
                )}>

                  <motion.div
                    className={cn(
                      "absolute inset-y-1 rounded-xl shadow-md z-0",
                      agentMode === 'studio' ? "bg-indigo-500" : (creativeMode ? "bg-indigo-500" : "bg-white dark:bg-neutral-700")
                    )}
                    initial={false}
                    animate={{
                      left: agentMode === 'vion' ? '4px' : (agentMode === 'pulse' ? 'calc(33.33% + 1px)' : 'calc(66.66% + 1px)'),
                      right: agentMode === 'vion' ? 'calc(66.66% + 1px)' : (agentMode === 'pulse' ? 'calc(33.33% + 1px)' : '4px'),
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                  <button 
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      if (agentMode !== 'vion') {
                        createNewSession();
                        setAgentMode('vion');
                      }
                    }}
                    className={cn(
                      "w-12 h-8 flex items-center justify-center text-[9px] font-black uppercase tracking-tighter transition-all relative z-10",
                      agentMode === 'vion' 
                        ? (creativeMode ? "text-white" : "text-neutral-900 dark:text-white")
                        : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    )}
                  >
                    Vion
                  </button>
                  <button 
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      if (agentMode !== 'pulse') {
                        createNewSession();
                        setAgentMode('pulse');
                      }
                    }}
                    className={cn(
                      "w-12 h-8 flex items-center justify-center text-[9px] font-black uppercase tracking-tighter transition-all relative z-10",
                      agentMode === 'pulse' 
                        ? (creativeMode ? "text-white" : "text-neutral-900 dark:text-white")
                        : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    )}
                  >
                    Pulse
                  </button>
                  <button 
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      if (agentMode !== 'studio') {
                        createNewSession();
                        setAgentMode('studio');
                      }
                    }}
                    className={cn(
                      "w-12 h-8 flex items-center justify-center text-[9px] font-black uppercase tracking-tighter transition-all relative z-10",
                      agentMode === 'studio' 
                        ? "text-white"
                        : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    )}
                  >
                    Studio
                  </button>
                </div>
          <button 
            type="submit" 
            disabled={isProcessing && !generationAbortControllerRef.current} 
            className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-20 disabled:scale-100 shadow-lg shrink-0",
              isProcessing ? "bg-red-500 text-white" : "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950"
            )}
                    onClick={(e) => {
                      if (isProcessing && generationAbortControllerRef.current) {
                        e.preventDefault();
                        generationAbortControllerRef.current.abort();
                      }
                    }}
                  >
                    {isProcessing ? <X className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                  </button>
              </div>
            </div>
          </form>
          <div className="mt-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => {
                if (e.target.files) handleFileUpload(Array.from(e.target.files));
              }} 
              className="hidden" 
              multiple 
            />
          </div>
        </div>
      </div>

      {/* Overlays */}
      <NotificationCenter />
      
      <AnimatePresence>
        {activeFile && (
          <CodeViewer 
            files={files}
            activeFile={activeFile}
            setActiveFile={setActiveFile}
            onClose={() => setActiveFile(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loading ? (
          <div className="fixed inset-0 z-[200] bg-neutral-950 flex items-center justify-center">
            <NeuralLoading />
          </div>
        ) : !user ? (
          <Login />
        ) : (!profile || !profile.onboardingCompleted) ? (
          <Onboarding />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-widest">Neural Identity</h3>
                </div>
                <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>
              <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto scrollbar-hide">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-neutral-100 dark:bg-neutral-800 border-2 border-blue-500/50 overflow-hidden relative group/avatar">
                    <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'user'}`} alt="User" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                      <Pencil className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-neutral-900 dark:text-white">{profile?.name}</p>
                    <p className="text-xs text-neutral-500 font-mono uppercase tracking-[0.2em]">Tier 0 Intelligence Associate</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">Cognitive Tag (Name)</label>
                    <input 
                      type="text"
                      value={editProfile.name}
                      onChange={(e) => setEditProfile(s => ({ ...s, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 focus:border-blue-500/50 outline-none rounded-2xl text-neutral-900 dark:text-white text-sm transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">Neural cycles (Age)</label>
                    <input 
                      type="number"
                      value={editProfile.age}
                      onChange={(e) => setEditProfile(s => ({ ...s, age: Number(e.target.value) }))}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 focus:border-blue-500/50 outline-none rounded-2xl text-neutral-900 dark:text-white text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-tight">Identity Verified</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">Biometric link established and secured.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                    <Smartphone className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-500 uppercase tracking-tight">Connected Device</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">Primary hardware interface synchronized.</p>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={isUpdatingProfile}
                  onClick={handleUpdateProfile}
                  className="w-full py-4 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50"
                >
                  {isUpdatingProfile ? 'Synchronizing...' : 'Update Neural Specs'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-widest">System Settings</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                {/* User Details */}
                <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-100 dark:border-neutral-800 rounded-2xl transition-colors">
                  <div className="w-12 h-12 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                    <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'user'}`} alt="Avatar" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{user?.displayName || profile.name || 'Anonymous'}</p>
                    <p className="text-[10px] text-neutral-500 truncate font-mono">{user?.email || 'No email provided'}</p>
                  </div>
                  <button 
                    onClick={() => signOut(auth)}
                    className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors text-neutral-500"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-4">
                  <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">Auto-Reload Threshold</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">The neural link will reset after 30 minutes of inactivity to preserve cognitive resources.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Workspace Optimization</h4>
                  <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 transition-all hover:border-neutral-200 dark:hover:border-neutral-700">
                    <span className="text-xs text-neutral-900 dark:text-white">Refine AI Output</span>
                    <div className="w-10 h-5 bg-emerald-500 rounded-full flex items-center px-1">
                       <div className="w-3 h-3 bg-white rounded-full translate-x-5" />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg"
                >
                  Clear All Data & Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ImageGenerator 
        isOpen={isImageGenOpen}
        onClose={() => setIsImageGenOpen(false)}
        onGenerate={handleGenerateImage}
        onUpscale={handleUpscaleImage}
        initialPrompt={agentMode === 'studio' ? inputValue : ''}
      />
    </div>
  </div>
);
}

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}
