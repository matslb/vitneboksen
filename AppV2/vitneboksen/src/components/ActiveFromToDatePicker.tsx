// Extracted ActiveFromToPicker component with validation

import React from 'react';

interface ActiveFromToPickerProps {
  activeFrom: string;
  activeTo: string;
  onChangeFrom: (val: string) => void;
  onChangeTo: (val: string) => void;
}

export default function ActiveFromToPicker({ activeFrom, activeTo, onChangeFrom, onChangeTo }: ActiveFromToPickerProps) {
  const isInvalid = activeFrom && activeTo && new Date(activeTo) < new Date(activeFrom);

  return (
    <div className="space-y-2 mb-4">
      <label className="block mb-1">Aktiv fra</label>
      <input
        type="datetime-local"
        value={activeFrom}
        onChange={(e) => onChangeFrom(e.target.value)}
        className="w-full p-2 rounded text-black"
      />
      <label className="block mb-1">Aktiv til</label>
      <input
        type="datetime-local"
        value={activeTo}
        onChange={(e) => onChangeTo(e.target.value)}
        className={`w-full p-2 rounded text-black ${isInvalid ? 'border border-red-500' : ''}`}
      />
      {isInvalid && <p className="text-red-500 text-sm">Sluttdato kan ikke være før startdato</p>}
    </div>
  );
}