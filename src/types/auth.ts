export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  avatarUrl?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}


export interface AuthResponse {
  token: string;
  user: User;
}
