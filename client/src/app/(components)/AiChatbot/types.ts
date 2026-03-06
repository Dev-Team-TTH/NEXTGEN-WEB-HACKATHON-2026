export interface MessageAction {
  label: string;
  path: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  actions?: MessageAction[]; // Nâng cấp: Nút điều hướng nhanh nhúng trong Chat
  isError?: boolean;         // Đánh dấu nếu AI gặp lỗi
}