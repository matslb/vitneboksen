interface ActiveFromToPickerProps {
  activeFrom: string;
  activeTo: string;
  allwaysActive: boolean;
  setAllwaysActive: (val: boolean) => void;
  onChangeFrom: (val: string) => void;
  onChangeTo: (val: string) => void;
}

export default function ActiveFromToPicker({ allwaysActive, setAllwaysActive, activeFrom, activeTo, onChangeFrom, onChangeTo }: ActiveFromToPickerProps) {
  const isInvalid = activeFrom && activeTo && new Date(activeTo) < new Date(activeFrom);
  return (
    <div className="relative  mb-4 flex gap-2 flex-col md:flex-row">
      <div className="flex flex-col gap-2">
        <label className="w-30">
          <input
            type="radio"
            checked={allwaysActive}
            className="mr-2 bg-white"
            onChange={() => {
              setAllwaysActive(true);
              onChangeFrom("");
              onChangeTo("");
            }}
          />
          Alltid aktiv
        </label>
        <label className="w-30">
          <input
            type="radio"
            checked={!allwaysActive}
            className="mr-2 bg-white"
            onChange={() => {
              setAllwaysActive(false)
            }} />
          Aktiv fra - til
        </label>
      </div>

      {!allwaysActive &&
        <div className="flex gap-4 justify-end w-full flex-col md:flex-row">
          <div>
            <label className="block mb-1">Aktiv fra
              <input
                type="datetime-local"
                value={activeFrom}
                max={activeTo}
                onChange={(e) => onChangeFrom(e.target.value)}
                className=" w-full p-2 bg-white rounded text-black"
              />
            </label>
          </div>
          <div >
            <label className="block mb-1">Aktiv til
              <input
                type="datetime-local"
                value={activeTo}
                min={activeFrom}
                onChange={(e) => onChangeTo(e.target.value)}
                className={`w-full bg-white p-2 rounded text-black ${isInvalid ? 'border border-red-500' : ''}`}
              />
            </label>
            {isInvalid && <p className="text-red-500 text-sm bottom-1">Sluttdato kan ikke være tidligere enn startdato</p>}
          </div>
        </div>
      }
    </div >
  );
}