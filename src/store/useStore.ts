import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { WorkspaceState, Message, AgentActivity, FileNode, AgentType, Chunk, Notification, UploadingFile, ChatSession } from '../types';

interface AppActions {
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string) => void;
  addActivity: (activity: Omit<AgentActivity, 'id' | 'timestamp'> & { id?: string }) => void;
  updateActivity: (id: string, updates: Partial<AgentActivity>) => void;
  setProcessing: (isProcessing: boolean) => void;
  setCurrentAgent: (agent: AgentType | null) => void;
  updateFiles: (files: FileNode[]) => void;
  setChunks: (chunks: Chunk[]) => void;
  setActiveFile: (path: string | null) => void;
  deleteFile: (path: string) => void;
  resetChat: () => void;
  addFile: (file: FileNode, path?: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'> & { id?: string }) => void;
  removeNotification: (id: string) => void;
  addUploadingFile: (file: UploadingFile) => void;
  updateUploadingFile: (id: string, updates: Partial<UploadingFile>) => void;
  removeUploadingFile: (id: string) => void;
  // Session actions
  createNewSession: () => void;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  updateSessionTitle: (id: string, title: string) => void;
  togglePinSession: (id: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setAgentMode: (mode: 'vion' | 'pulse' | 'studio') => void;
  setCreativeMode: (active: boolean) => void;
}

const DEFAULT_FILES: FileNode[] = [];

export const useStore = create<WorkspaceState & AppActions>()(
  persist(
    (set, get) => {
      const getActiveSession = (state: WorkspaceState) => {
        return state.sessions.find(s => s.id === state.currentSessionId) || state.sessions[0];
      };

      const updateActiveSession = (state: WorkspaceState, updates: Partial<ChatSession>) => {
        return {
          sessions: state.sessions.map(s => 
            s.id === state.currentSessionId ? { ...s, ...updates } : s
          )
        };
      };

      return {
        sessions: [
          {
            id: 'default-session',
            title: 'New Session',
            messages: [],
            activities: [],
            files: DEFAULT_FILES,
            chunks: [],
            timestamp: Date.now()
          }
        ],
        currentSessionId: 'default-session',
        notifications: [],
        uploadingFiles: [],
        currentAgent: null,
        agentMode: 'vion',
        isProcessing: false,
        activeFile: null,
        theme: 'dark',
        creativeMode: false,

        setTheme: (theme) => set({ theme }),
        setAgentMode: (mode) => set({ agentMode: mode }),
        setCreativeMode: (active) => set({ creativeMode: active }),

        createNewSession: () => set((state) => {
          const newSession: ChatSession = {
            id: Math.random().toString(36).substring(7),
            title: 'New Session',
            messages: [],
            activities: [],
            files: DEFAULT_FILES,
            chunks: [],
            timestamp: Date.now()
          };
          return {
            sessions: [newSession, ...state.sessions],
            currentSessionId: newSession.id
          };
        }),

        switchSession: (id) => set({ currentSessionId: id }),

        deleteSession: (id) => set((state) => {
          const newSessions = state.sessions.filter(s => s.id !== id);
          const nextId = id === state.currentSessionId 
            ? (newSessions[0]?.id || null) 
            : state.currentSessionId;
          
          if (newSessions.length === 0) {
             const defaultSession: ChatSession = {
              id: 'default-session',
              title: 'New Session',
              messages: [],
              activities: [],
              files: DEFAULT_FILES,
              chunks: [],
              timestamp: Date.now()
            };
            return { sessions: [defaultSession], currentSessionId: defaultSession.id };
          }

          return { sessions: newSessions, currentSessionId: nextId };
        }),

        updateSessionTitle: (id: string, title: string) => set((state) => ({
          sessions: state.sessions.map(s => s.id === id ? { ...s, title } : s)
        })),

        togglePinSession: (id) => set((state) => ({
          sessions: state.sessions.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s)
        })),

        addUploadingFile: (file) => set((state) => ({
          uploadingFiles: [...state.uploadingFiles, file]
        })),

        updateUploadingFile: (id, updates) => set((state) => ({
          uploadingFiles: state.uploadingFiles.map(f => f.id === id ? { ...f, ...updates } : f)
        })),

        removeUploadingFile: (id) => set((state) => ({
          uploadingFiles: state.uploadingFiles.filter(f => f.id !== id)
        })),

        addNotification: (notif) => set((state) => ({
          notifications: [...state.notifications, { 
            id: (notif as any).id || Math.random().toString(36).substring(7), 
            timestamp: Date.now(),
            ...notif 
          }]
        })),

        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),

        addMessage: (msg) => set((state) => {
          const session = getActiveSession(state);
          const newMessage = { ...msg, id: Math.random().toString(36).substring(7), timestamp: Date.now() };
          
          // Auto-rename session based on first user message
          let newTitle = session.title;
          if (session.messages.length === 1 && msg.role === 'user') {
            newTitle = msg.content.slice(0, 30) + (msg.content.length > 30 ? '...' : '');
          }

          return {
            sessions: state.sessions.map(s => 
              s.id === state.currentSessionId 
                ? { ...s, messages: [...s.messages, newMessage], title: newTitle } 
                : s
            )
          };
        }),

        updateLastMessage: (content) => set((state) => {
          const session = getActiveSession(state);
          const newMessages = [...session.messages];
          if (newMessages.length > 0) {
            newMessages[newMessages.length - 1].content = content;
          }
          return updateActiveSession(state, { messages: newMessages });
        }),

        addActivity: (act) => set((state) => {
          const id = (act as any).id || Math.random().toString(36).substring(7);
          const session = getActiveSession(state);
          return updateActiveSession(state, { 
            activities: [{ ...act, id, timestamp: Date.now() }, ...session.activities] 
          });
        }),

        updateActivity: (id, updates) => set((state) => {
          const session = getActiveSession(state);
          return updateActiveSession(state, {
            activities: session.activities.map(a => a.id === id ? { ...a, ...updates } : a)
          });
        }),

        setProcessing: (isProcessing) => set({ isProcessing }),
        setCurrentAgent: (agent) => set({ currentAgent: agent }),
        
        updateFiles: (files) => set((state) => updateActiveSession(state, { files })),
        setChunks: (chunks) => set((state) => updateActiveSession(state, { chunks })),
        setActiveFile: (path) => set({ activeFile: path }),
        
        deleteFile: (path) => set((state) => {
          const session = getActiveSession(state);
          const parts = path.split('/');
          
          const removeNode = (nodes: FileNode[], currentPath: string): FileNode[] => {
            return nodes.filter(node => {
              const fullNodePath = currentPath ? `${currentPath}/${node.name}` : node.name;
              if (fullNodePath === path) return false;
              if (node.type === 'directory' && node.children) {
                node.children = removeNode(node.children, fullNodePath);
              }
              return true;
            });
          };

          const newFiles = removeNode(session.files, '');
          return {
            ...updateActiveSession(state, { files: newFiles }),
            activeFile: state.activeFile === path ? null : state.activeFile
          };
        }),
        
        addFile: (file, path = 'uploads') => set((state) => {
          const session = getActiveSession(state);
          const newFiles = [...session.files];
          let uploadsDir = newFiles.find(f => f.name === path && f.type === 'directory');
          
          if (!uploadsDir) {
            uploadsDir = { name: path, type: 'directory', children: [] };
            newFiles.push(uploadsDir);
          }
          
          if (uploadsDir.children) {
            const exists = uploadsDir.children.find(f => f.name === file.name);
            if (!exists) {
              uploadsDir.children.push(file);
            } else {
              exists.content = file.content;
            }
          }
          
          return { 
            ...updateActiveSession(state, { files: newFiles }), 
            activeFile: `${path}/${file.name}` 
          };
        }),

        resetChat: () => {
          get().createNewSession();
        }
      };
    },
    {
      name: 'vion-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        theme: state.theme,
        agentMode: state.agentMode,
        creativeMode: state.creativeMode
      }),
    }
  )
);
