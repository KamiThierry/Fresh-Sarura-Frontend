export interface YieldForecast {
    id: number;
    cycleId: number;
    submitted: string;
    harvestDate: string;
    crop: string;
    prediction: number;
    status: 'Pending' | 'Verified';
    confidence: string;
    notes: string;
    accuracy: number | null;
    variance: string | null;
    pmReply?: string;
}

const STORAGE_KEY = 'fresh_sarura_forecasts';

const INITIAL_FORECASTS: YieldForecast[] = [
    { id: 1, cycleId: 1, submitted: 'Oct 01', harvestDate: 'Oct 15', crop: 'Avocado', prediction: 4500, status: 'Verified', confidence: 'High', notes: 'Optimal weather expected. Should hit target.', accuracy: 98, variance: 'High Match' },
    { id: 4, cycleId: 1, submitted: 'Oct 08', harvestDate: 'Oct 22', crop: 'Avocado', prediction: 4800, status: 'Pending', confidence: 'Medium', notes: 'Some early drops, but overall volume is stable.', accuracy: null, variance: null },
    { id: 2, cycleId: 2, submitted: 'Sep 24', harvestDate: 'Oct 01', crop: 'Chili', prediction: 3200, status: 'Verified', confidence: 'Medium', notes: '', accuracy: 80, variance: '-20% Off' },
    { id: 3, cycleId: 3, submitted: 'Sep 10', harvestDate: 'Sep 25', crop: 'Beans', prediction: 1200, status: 'Verified', confidence: 'High', notes: '', accuracy: 95, variance: 'High Match' },
];

export const getForecasts = (): YieldForecast[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FORECASTS));
    return INITIAL_FORECASTS;
};

export const saveForecasts = (forecasts: YieldForecast[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(forecasts));
    window.dispatchEvent(new Event('forecastsChanged'));
};
