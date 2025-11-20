export interface Member {
  id: string;
  churchId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  dateOfBirth?: Date;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  registrationType: 'manual' | 'qr_code' | 'import';
  status: 'active' | 'inactive' | 'suspended';
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateMemberDTO {
  churchId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  dateOfBirth?: Date;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  registrationType?: 'manual' | 'qr_code' | 'import';
  status?: 'active' | 'inactive' | 'suspended';
  createdBy?: string;
}

export interface UpdateMemberDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  dateOfBirth?: Date;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  status?: 'active' | 'inactive' | 'suspended';
  updatedBy?: string;
}

export interface MemberFilters {
  churchId: string;
  search?: string;
  status?: string;
  gender?: string;
  maritalStatus?: string;
  page: number;
  limit: number;
}
