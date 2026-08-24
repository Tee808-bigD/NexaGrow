export interface Movie {
  movie_id: number;
  title: string;
  genre: string;
  release_date: string;
  budget: number;
  box_office_domestic: number;
  box_office_international: number;
  streaming_views: number;
  sentiment_score: number;
}

export interface DbStatus {
  useRemote: boolean;
  hasCredentials: boolean;
  host: string;
  rowCount: number;
  schema: string;
}

export interface ConfigState {
  host: string;
  port: number;
  username: string;
  database: string;
  useRemote: boolean;
  passwordMasked: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  toolLogs?: {
    toolName: string;
    args: any;
    result: any;
  }[];
}
