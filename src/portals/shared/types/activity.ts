// Shared activity & budget-request types used across FM and PM portals.

export interface ActivityLineItem {
    id: number;
    activityName: string;
    category?: string;
    estimatedCostRwf: number;
}

export interface BudgetRequest {
    id: number;
    cycleId: string | number;
    cycleName: string;
    submittedBy: string;
    submittedAt: string;
    startDate: string;
    endDate: string;
    lineItems: ActivityLineItem[];
    totalRequestedRwf: number;
    approvalStatus: 'Pending' | 'Approved' | 'Rejected';
}

export interface Task {
    id: number;
    title: string;
    date: string;           // display date, e.g. "Oct 15"
    completed: boolean;
    proofRequired?: boolean;
    sop?: string;
    estimatedCostRwf?: number;
    approvedBudgetRwf?: number;  // PM-validated budget for this task
    startDate?: string;          // e.g. "Oct 15, 2026"
    endDate?: string;            // e.g. "Oct 17, 2026"
    block?: string;              // e.g. "Block B1"
    approvalStatus?: 'Pending' | 'Approved' | 'Rejected' | 'Flagged';
    actualCostRwf?: number;      // Actual cost reported by FM on field report
    statusDate?: string;         // Date the status changed, e.g. "Apr 3, 2026"
    pmNote?: string;             // PM's feedback / rejection reason
    fieldNote?: string;          // FM's field notes submitted with report
    category?: string;           // Labor, Inputs, etc.
    proofUrl?: string;           // URL of the evidence image (for resubmission)
}
