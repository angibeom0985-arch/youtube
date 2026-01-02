
import React from 'react';

interface KeywordPillProps {
  keyword: string;
}

const KeywordPill: React.FC<KeywordPillProps> = ({ keyword }) => {
  return (
    <span className="inline-block bg-zinc-700 text-white text-sm font-medium mr-2 mb-2 px-3 py-1 rounded-full">
      {keyword}
    </span>
  );
};

export default KeywordPill;
