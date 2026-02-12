
import React from 'react';

interface KeywordPillProps {
  keyword: string;
}

const KeywordPill: React.FC<KeywordPillProps> = ({ keyword }) => {
  return (
    <span className="inline-block bg-orange-500/10 border border-orange-500/50 text-orange-200 text-sm font-medium mr-2 mb-2 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.1)]">
      {keyword}
    </span>
  );
};

export default KeywordPill;
