export interface CreateFamilyDTO {
    churchId: string;
    name: string;
    fatherId?: string;
    motherId?: string;
    email?: string;
    phone?: string;
    address?: string;
    wardIds?: string[];
}

export interface UpdateFamilyDTO extends Partial<CreateFamilyDTO> {}

export interface FamilyFilters {
    churchId: string;
    search?: string;
    page?: number;
    limit?: number;
}
