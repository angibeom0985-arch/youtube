import React from 'react';

export type AspectRatio = '9:16' | '16:9' | '1:1';

interface AspectRatioSelectorProps {
    selectedRatio: AspectRatio;
    onRatioChange: (ratio: AspectRatio) => void;
    className?: string;
}

const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
    selectedRatio,
    onRatioChange,
    className = ''
}) => {
    const ratioOptions = [
        {
            value: '9:16' as AspectRatio,
            label: '9:16',
            description: '세로형 (인스타그램 스토리, 유튜브 쇼츠)',
            icon: '📱',
            dimensions: '모바일 세로'
        },
        {
            value: '16:9' as AspectRatio,
            label: '16:9',
            description: '가로형 (유튜브 일반, 영화)',
            icon: '🖥️',
            dimensions: '데스크톱 가로'
        },
        {
            value: '1:1' as AspectRatio,
            label: '1:1',
            description: '정사각형 (인스타그램 피드)',
            icon: '⬜',
            dimensions: '정사각형'
        }
    ];

    return (
        <div className={`space-y-3 ${className}`}>
            <h3 className="text-lg font-medium text-blue-300 flex items-center">
                <span className="mr-2">📐</span>
                이미지 비율 선택
            </h3>
            <p className="text-sm text-gray-400 mb-4">
                생성할 이미지의 비율을 선택하세요. 용도에 맞는 비율을 선택하면 더 효과적입니다.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {ratioOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onRatioChange(option.value)}
                        className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                            selectedRatio === option.value
                                ? 'border-blue-500 bg-blue-600/20 shadow-lg scale-105'
                                : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-600/50'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{option.icon}</span>
                            {selectedRatio === option.value && (
                                <span className="text-blue-400 text-xl">✓</span>
                            )}
                        </div>
                        
                        <div className="space-y-1">
                            <div className="font-semibold text-white text-lg">
                                {option.label}
                            </div>
                            <div className="text-sm text-gray-300">
                                {option.dimensions}
                            </div>
                            <div className="text-xs text-gray-400 leading-tight">
                                {option.description}
                            </div>
                        </div>
                        
                        {/* 비율 미리보기 */}
                        <div className="mt-3 flex justify-center">
                            <div 
                                className={`border-2 border-gray-400 ${
                                    selectedRatio === option.value ? 'border-blue-400' : ''
                                } ${
                                    option.value === '9:16' 
                                        ? 'w-4 h-7' 
                                        : option.value === '16:9' 
                                            ? 'w-7 h-4' 
                                            : 'w-5 h-5'
                                }`}
                            />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AspectRatioSelector;