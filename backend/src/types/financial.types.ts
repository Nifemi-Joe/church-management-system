export interface CreateOfferingDTO {
    churchId: string;
    eventId?: string;
    date: Date;
    items: {
        offeringItemId: string;
        channel: string;
        amount: number;
    }[];
    notes?: string;
}

export interface CreatePledgeDTO {
    churchId: string;
    memberId: string;
    amount: number;
    purpose: string;
    startDate: Date;
    endDate: Date;
    frequency: 'weekly' | 'monthly' | 'yearly';
}

export interface CreateTransactionDTO {
    churchId: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    date: Date;
    description: string;
    accountId: string;
    reference?: string;
}

export interface CreateAccountDTO {
    churchId: string;
    name: string;
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    code: string;
    description?: string;
    parentAccountId?: string;
}
