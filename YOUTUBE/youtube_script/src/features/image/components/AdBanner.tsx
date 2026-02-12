import React, { useEffect } from 'react';

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

const AdBanner: React.FC = () => {
    const hasLoaded = React.useRef(false);

    useEffect(() => {
        if (hasLoaded.current || typeof window === 'undefined') return;

        const timer = setTimeout(() => {
            try {
                if (window.adsbygoogle) {
                    window.adsbygoogle.push({});
                    hasLoaded.current = true;
                }
            } catch (err) {
                // 광고 차단기 등으로 인한 오류 무시
            }
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div style={{ 
            margin: '2rem auto', 
            padding: '0 1rem', 
            maxWidth: '1280px',
            textAlign: 'center'
        }}>
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-2686975437928535"
                data-ad-slot="2376295288"
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
    );
};

export default AdBanner;
