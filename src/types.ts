export type AgentType = 'planner' | 'coder' | 'researcher' | 'reviewer' | 'deployer' | 'system';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent?: AgentType;
  timestamp: number;
  imageUrl?: string;
}

export interface AgentActivity {
  id: string;
  agent: AgentType;
  status: 'thinking' | 'executing' | 'idle' | 'complete' | 'error' | 'researching' | 'reviewing';
  label: string;
  description: string;
  timestamp: number;
  logs?: string[];
}

export interface FileNode {
  name: string;
  content?: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  language?: string;
  mimeType?: string;
}

export interface Chunk {
  id: string;
  fileId: string;
  text: string;
  embedding?: number[];
  metadata: {
    fileName: string;
    path: string;
    type?: string;
  };
}

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
  timestamp: number;
}

export interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'indexing' | 'complete' | 'error';
  preview?: string;
  type?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  activities: AgentActivity[];
  files: FileNode[];
  chunks: Chunk[];
  timestamp: number;
  isPinned?: boolean;
}

export interface WorkspaceState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  notifications: Notification[];
  uploadingFiles: UploadingFile[];
  currentAgent: AgentType | null;
  agentMode: 'vion' | 'pulse' | 'studio';
  isProcessing: boolean;
  activeFile: string | null;
  theme: 'dark' | 'light';
  creativeMode: boolean;
}
