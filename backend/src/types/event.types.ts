export interface CreateEventDTO {
    churchId: string;
    name: string;
    details?: string;
    groupId?: string;
    date: Date;
    isPaid: boolean;
    price?: number;
    bannerUrl?: string;
}

export interface CreateServiceReportDTO {
    churchId: string;
    date: Date;
    topic: string;
    preacher: string;
    category: string;
    attendance: {
        type: string;
        count: number;
    }[];
    offerings: {
        itemId: string;
        channel: string;
        amount: number;
    }[];
    expenses: {
        itemId: string;
        accountId: string;
        amount: number;
    }[];
    notes?: string;
}
