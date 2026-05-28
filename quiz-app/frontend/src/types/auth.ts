// src/types/auth.ts
export type LoginRequest = {
  loginId: string;
  password: string;
};

export type LoginResponse = {
  token: string;
};