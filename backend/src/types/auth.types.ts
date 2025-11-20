export interface RegisterDTO {
  churchId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'staff' | 'member';
}

export interface LoginDTO {
  email: string;
  password: string;
}
