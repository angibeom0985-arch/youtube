
import React from 'react';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Slider: React.FC<SliderProps> = ({ label, min, max, value, onChange }) => {
  return (
    <div className="w-full">
      <label htmlFor="slider" className="block mb-2 text-sm font-medium text-gray-300">
        {label}: <span className="font-bold text-indigo-400">{value}</span>
      </label>
      <input
        id="slider"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
    </div>
  );
};

export default Slider;
