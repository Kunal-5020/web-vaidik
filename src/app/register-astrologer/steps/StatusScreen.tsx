'use client';
import React from 'react';

// Simplified color mapper
const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    default: return 'bg-orange-100 text-orange-700';
  }
};

export default function StatusScreen({ data }: { data: any }) {
  return (
    <div className="p-8 h-full flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Registration Status</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${getStatusColor(data.status)}`}>
                {data.status.replace(/_/g, ' ')}
            </span>
        </div>

        <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Name</span>
                <span className="font-semibold">{data.name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Ticket</span>
                <span className="font-mono text-[#5b2b84] font-bold">{data.ticketNumber}</span>
            </div>
        </div>

        {/* Rejection Specifics */}
        {data.status === 'rejected' && (
            <div className="mt-6 bg-red-50 p-4 rounded-xl border border-red-100">
                <h3 className="text-red-800 font-bold mb-1">Application Not Approved</h3>
                <p className="text-red-600 text-sm mb-2">{data.rejection?.reason}</p>
                {data.rejection?.canReapply && (
                    <p className="text-xs text-red-500 italic">
                        You can reapply after {new Date(data.rejection.reapplyAfter).toLocaleDateString()}
                    </p>
                )}
            </div>
        )}
      </div>

      <button onClick={() => window.location.reload()} className="mt-8 text-[#5b2b84] font-semibold hover:underline">
        Back to Home
      </button>
    </div>
  );
}