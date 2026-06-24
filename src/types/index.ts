
export interface Farmer {
    _id: string;
    full_name: string;
    farm_name?: string | null;
    province?: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
    produce_types: string[];
    farm_size_hectares: number;
    production_capacity_tons: number;
    phone: string;
    email: string | null;
    national_id: string;
    status: 'Active' | 'Inactive' | 'Auditing';
    grade?: string;
    photo_url?: string | null;
    id_certificate_url?: string | null;
    created_at?: string;
    createdAt?: string;
    updated_at?: string;
    updatedAt?: string;
    latitude?: number;
    longitude?: number;
}

export interface CropCycle {
    _id: string;
    farmer_id: string;
    farm_name: string;
    crop_name: string;
    season: string;
    start_date: string;
    planting_date: string;
    expected_harvest_date: string;
    block_name: string;
    block_size_hectares: number;
    field_size_hectares: number;
    total_budget: number;
    spent: number;
    status: 'active' | 'in_progress' | 'completed';
    yield_goal_kg?: number;
    final_yield?: string;
    budget_seeds?: number;
    budget_fertilizers?: number;
    budget_chemicals?: number;
    budget_labor?: number;
}

export interface BudgetRequest {
    _id: string;
    cycleId: string;
    cycleName: string;
    farm_name?: string;
    submittedByName: string;
    totalRequestedRwf: number;
    approvalStatus: 'Pending' | 'Approved' | 'Rejected';
    createdAt: string;
    lineItems: Array<{
        category: string;
        activityName: string;
        estimatedCostRwf: number;
    }>;
    cycle_budget_categories?: Array<{
        name: string;
        allocated: number;
        spent: number;
    }>;
}
