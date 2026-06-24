import { useState } from 'react';
import { MapPin, Phone, Truck, CheckCircle2, Navigation, Package, Key } from 'lucide-react';
import { useParams } from 'react-router-dom';
import logo from '@/assets/sarura_logo_nav.png';

type TaskStep = 'en-route' | 'at-farm' | 'completed';

const DriverTaskView = () => {
    const { taskId } = useParams();
    const [step, setStep] = useState<TaskStep>('en-route');
    const [crates, setCrates] = useState('');
    const [releaseCode, setReleaseCode] = useState('');
    const [hasPhoto, setHasPhoto] = useState(false);

    const handleArrived = () => setStep('at-farm');

    const handleTakePhoto = () => {
        // Mock photo upload
        setHasPhoto(true);
    };

    const handleConfirmPickup = () => {
        if (crates && releaseCode && hasPhoto) {
            setStep('completed');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header / Top Bar */}
            <div className="bg-white p-4 shadow-sm border-b sticky top-0 z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img src={logo} alt="Fresh Sarura" className="h-8 w-auto" />
                    <div>
                        <h1 className="text-sm font-bold text-green-700 leading-tight">Fresh Sarura</h1>
                        <p className="text-[8px] font-medium text-gray-500 uppercase tracking-wider">Driver Lite</p>
                    </div>
                </div>
                <span className="text-[10px] font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                    Task #{taskId || '1024'}
                </span>
            </div>

            <main className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col">

                {/* VIEW A: EN ROUTE */}
                {step === 'en-route' && (
                    <div className="flex-1 flex flex-col animate-fade-in">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                                <Truck size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">Pickup Assignment</h2>
                            <p className="text-gray-500">Simbi Farm - Sector 4</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-auto">
                            <button className="flex flex-col items-center justify-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 transition-colors">
                                <Navigation size={32} className="text-blue-600 mb-2" />
                                <span className="font-bold text-gray-900 text-sm">Navigate to Farm<br /><span className="text-gray-500 font-normal text-xs">(12 km away)</span></span>
                            </button>
                            <button className="flex flex-col items-center justify-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 transition-colors">
                                <Phone size={32} className="text-green-600 mb-2" />
                                <span className="font-bold text-gray-900">Call Contact</span>
                            </button>
                        </div>

                        <button
                            onClick={handleArrived}
                            className="w-full bg-blue-600 text-white py-5 rounded-2xl text-xl font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-transform mt-6 flex items-center justify-center gap-3"
                        >
                            <Truck size={24} />
                            I Have Arrived
                        </button>
                    </div>
                )}

                {/* VIEW B: AT FARM */}
                {step === 'at-farm' && (
                    <div className="flex-1 flex flex-col animate-fade-in">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Package className="text-orange-500" />
                                Confirm Cargo
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Crates Loaded</label>
                                    <input
                                        type="number"
                                        value={crates}
                                        onChange={(e) => setCrates(e.target.value)}
                                        className="w-full p-4 text-2xl font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Release Code</label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number"
                                            value={releaseCode}
                                            onChange={(e) => setReleaseCode(e.target.value)}
                                            className="w-full p-4 pl-12 text-xl font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                            placeholder="XXXX"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Ask the Service Center Manager for this code.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto space-y-3">
                            <button
                                onClick={handleTakePhoto}
                                className={`w-full py-4 rounded-xl text-lg font-bold border-2 transition-colors flex items-center justify-center gap-2
                                    ${hasPhoto
                                        ? 'bg-green-50 border-green-500 text-green-700'
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                                {hasPhoto ? (
                                    <>
                                        <CheckCircle2 size={24} />
                                        Photo Captured
                                    </>
                                ) : (
                                    <>
                                        <span className="text-2xl">📷</span>
                                        Take Photo of Truck
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleConfirmPickup}
                                disabled={!crates || !releaseCode || !hasPhoto}
                                className={`w-full py-5 rounded-2xl text-xl font-bold shadow-lg transition-all flex items-center justify-center gap-3
                                    ${crates && releaseCode && hasPhoto
                                        ? 'bg-green-600 text-white shadow-green-900/20 active:scale-95'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                <CheckCircle2 size={24} />
                                Confirm Pickup
                            </button>
                        </div>
                    </div>
                )}

                {/* VIEW C: COMPLETED */}
                {step === 'completed' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in pb-20">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce-short">
                            <CheckCircle2 size={48} className="text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pickup Confirmed</h2>
                        <p className="text-gray-500 max-w-xs mx-auto mb-8">
                            Cargo has been logged. Please proceed to HQ immediately.
                        </p>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 w-full max-w-xs shadow-sm">
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Trip ID</p>
                            <p className="text-xl font-mono font-bold text-gray-900">#{taskId || '1024'}</p>
                            <div className="h-1 w-full bg-green-100 rounded-full mt-3 overflow-hidden">
                                <div className="h-full bg-green-500 w-full animate-pulse"></div>
                            </div>
                            <p className="text-xs text-green-600 mt-2 font-medium">Synced with Logistics Portal</p>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default DriverTaskView;
