interface ActiveFromToPickerProps {
  activeFrom: string;
  activeTo: string;
  alwaysActive: boolean;
  setAlwaysActive: (val: boolean) => void;
  onChangeFrom: (val: string) => void;
  onChangeTo: (val: string) => void;
}

export default function ActiveFromToPicker({ alwaysActive, setAlwaysActive, activeFrom, activeTo, onChangeFrom, onChangeTo }: ActiveFromToPickerProps) {
  const isInvalid = activeFrom && activeTo && new Date(activeTo) < new Date(activeFrom);

  return (
    <div className="space-y-2 mb-4">
         <div className="mb-4">
          <label className="mr-4">
            <input
              type="radio"
              checked={alwaysActive}
              onChange={() => setAlwaysActive(true)}
              className="mr-1"
            />
            Alltid aktiv
          </label>
          <label>
            <input
              type="radio"
              checked={!alwaysActive}
              onChange={() => setAlwaysActive(false)}
              className="mr-1"
            />
            Aktiv fra - til
          </label>
        </div>

        {!alwaysActive && 
        <>
          <label className="block mb-1">Aktiv fra</label>
          <input
            type="datetime-local"
            value={activeFrom}
            max={activeTo}
            onChange={(e) => onChangeFrom(e.target.value)}
            className="w-full p-2 rounded text-black"
            />
          <label className="block mb-1">Aktiv til</label>
          <input
            type="datetime-local"
            value={activeTo}
            min={activeFrom}
            onChange={(e) => onChangeTo(e.target.value)}
            className={`w-full p-2 rounded text-black ${isInvalid ? 'border border-red-500' : ''}`}
            />
          </>
        }
      {isInvalid && <p className="text-red-500 text-sm">Sluttdato kan ikke være før startdato</p>}
    </div>
  );
}