import { useState, useEffect, useCallback } from 'react';
import { FlaskConical, PackageCheck, Loader2, RefreshCw, ClipboardCheck, ArrowRight } from 'lucide-react';
import { api } from '../../../lib/api';
import RecordQCModal from '../components/RecordQCModal';
import { useToastContext } from '@/context/ToastContext';
import { formatDateTime } from '@/lib/dateUtils';

type IntakeLog = {
  _id: string;
  pickedUpWeightKg: number;
  truckId: string;
  arrivedAt: string;
  createdAt: string;
  harvestDeclarationId: {
    cropName: string;
    farmName: string;
    estimatedWeightKg: number;
  };
};

type ProcessingBatch = {
  _id: string;
  cropName: string;
  receivedWeightKg: number;
  processedWeightKg?: number;
  rejectedWeightKg?: number;
  assignedRoom?: string;
  status: 'RoomRequested' | 'Processing' | 'Done';
  createdAt: string;
  intakeLogId: any;
};

const Processing = () => {
  const [intakeLogs, setIntakeLogs] = useState<IntakeLog[]>([]);
  const [batches, setBatches] = useState<ProcessingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingRoomId, setRequestingRoomId] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const { showToast } = useToastContext();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [declarationsRes, batchesRes] = await Promise.all([
        api.get('/harvest-declarations?status=PickedUp'),
        api.get('/processing-batches/my'),
      ]);

      // Filter intake logs that don't yet have a batch
      const batchIntakeIds = new Set(
        (batchesRes.data as ProcessingBatch[]).map((b: any) => b.intakeLogId?._id || b.intakeLogId)
      );
      const unprocessed = (declarationsRes.data as any[]).filter(
        d => d.intakeLogId && !batchIntakeIds.has(d.intakeLogId?._id || d.intakeLogId)
      );

      setIntakeLogs(unprocessed.map((d: any) => ({
        _id: d.intakeLogId?._id || d.intakeLogId,
        pickedUpWeightKg: d.intakeLogId?.pickedUpWeightKg || d.estimatedWeightKg,
        truckId: d.intakeLogId?.truckId || '',
        arrivedAt: d.intakeLogId?.arrivedAt || d.updatedAt,
        createdAt: d.createdAt,
        harvestDeclarationId: {
          cropName: d.cropName,
          farmName: d.farmName,
          estimatedWeightKg: d.estimatedWeightKg,
        }
      })));

      setBatches(batchesRes.data);
    } catch (err) {
      console.error('Failed to fetch processing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRequestRoom = async (intakeLog: IntakeLog) => {
    setRequestingRoomId(intakeLog._id);
    try {
      await api.post('/processing-batches', {
        intakeLogId: intakeLog._id,
        receivedWeightKg: intakeLog.pickedUpWeightKg,
        cropName: intakeLog.harvestDeclarationId.cropName,
      });
      showToast(
        'Room Requested',
        `A request for ${intakeLog.harvestDeclarationId.cropName} has been sent to the PM.`
      );
      await fetchData();
    } catch (err) {
      console.error('Failed to request room:', err);
      showToast(
        'Request Failed',
        'Could not send room request. Please try again.'
      );
    } finally {
      setRequestingRoomId(null);
    }
  };

  const processingBatches = batches.filter(b => b.status === 'Processing');
  const pendingRoomBatches = batches.filter(b => b.status === 'RoomRequested');
  const doneBatches = batches.filter(b => b.status === 'Done');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Processing</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Request processing rooms and log batch weights.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Ready to Process', value: intakeLogs.length, icon: FlaskConical, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Awaiting Room', value: pendingRoomBatches.length, icon: PackageCheck, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'In Processing', value: processingBatches.length, icon: ClipboardCheck, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Completed', value: doneBatches.length, icon: PackageCheck, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                  <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {s.value}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${s.bg}`}>
                  <s.icon size={24} className={s.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Section 1 — Arrived, needs room request */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <FlaskConical size={18} className="text-blue-600" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Arrived — Request Processing Room</h2>
            {intakeLogs.length > 0 && (
              <span className="ml-auto text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                {intakeLogs.length} pending
              </span>
            )}
          </div>
          {intakeLogs.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              No produce awaiting room request.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {intakeLogs.map(log => (
                <div key={log._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-sm">
                      {log.harvestDeclarationId.cropName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{log.harvestDeclarationId.cropName}</p>
                      <p className="text-xs text-gray-500">{log.harvestDeclarationId.farmName} · {log.pickedUpWeightKg.toLocaleString()} kg picked up</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">
                      Arrived: {formatDateTime(log.arrivedAt)}
                    </span>
                    <button
                      onClick={() => handleRequestRoom(log)}
                      disabled={requestingRoomId === log._id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {requestingRoomId === log._id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <ArrowRight size={13} />
                      )}
                      Request Room
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2 — Awaiting room assignment */}
        {pendingRoomBatches.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-100 dark:border-amber-900/30 flex items-center gap-2">
              <PackageCheck size={18} className="text-amber-600" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Awaiting Room Assignment from PM</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {pendingRoomBatches.map(batch => (
                <div key={batch._id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{batch.cropName}</p>
                    <p className="text-xs text-gray-500">{batch.receivedWeightKg.toLocaleString()} kg received</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Room Requested
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3 — Room assigned, ready to log */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <ClipboardCheck size={18} className="text-green-600" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Room Assigned — Log Processing Results</h2>
            {processingBatches.length > 0 && (
              <span className="ml-auto text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                {processingBatches.length} ready
              </span>
            )}
          </div>
          {processingBatches.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              No batches in processing yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {processingBatches.map(batch => (
                <div key={batch._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 font-bold text-sm">
                      {batch.cropName?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{batch.cropName}</p>
                      <p className="text-xs text-gray-500">
                        Room: <span className="font-semibold text-green-600">{batch.assignedRoom}</span> · {batch.receivedWeightKg.toLocaleString()} kg received
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { 
                      setSelectedBatch({
                        intakeId: batch._id,
                        crop: batch.cropName,
                        supplier: batch.intakeLogId?.farmerId?.full_name || 'Generic Source',
                        grossWeight: batch.receivedWeightKg,
                        assignedRoom: batch.assignedRoom
                      }); 
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    <ClipboardCheck size={13} /> Log Results
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RecordQCModal
        isOpen={!!selectedBatch}
        onClose={() => setSelectedBatch(null)}
        data={selectedBatch}
        onSubmit={async (res) => {
          try {
            await api.patch(`/processing-batches/${res.intakeId}/complete`, {
              processedWeightKg: res.processedWeight,
              rejectedWeightKg: res.rejectedWeight,
              defectType: res.defectType,
              assignedGrade: res.grade
            });
            setSelectedBatch(null);
            showToast(
              'Results Logged',
              `Final weights for ${selectedBatch?.crop} have been recorded.`
            );
            fetchData();
          } catch (err) {
            console.error('Failed to complete QC:', err);
          }
        }}
      />

    </>
  );
};

export default Processing;
