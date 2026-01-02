import React, { useEffect } from 'react';

interface MetaTagsProps {
    title: string;
    description: string;
    url: string;
    image?: string;
    type?: string;
}

const MetaTags: React.FC<MetaTagsProps> = ({ 
    title, 
    description, 
    url, 
    image = '/og-image.png',
    type = 'website'
}) => {
    useEffect(() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://youtube.money-hotissue.com';
        const resolvedUrl = url.startsWith('http') ? url : `${origin}${url}`;
        const resolvedImage = image.startsWith('http') ? image : `${origin}${image}`;

        // 페이지 제목 설정
        document.title = title;
        
        // 메타 태그 업데이트 함수
        const updateMetaTag = (property: string, content: string) => {
            let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('property', property);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        };

        const updateNameMetaTag = (name: string, content: string) => {
            let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('name', name);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        };

        // Open Graph 메타 태그 설정
        updateMetaTag('og:title', title);
        updateMetaTag('og:description', description);
        updateMetaTag('og:url', resolvedUrl);
        updateMetaTag('og:image', resolvedImage);
        updateMetaTag('og:image:width', '1200');
        updateMetaTag('og:image:height', '630');
        updateMetaTag('og:image:type', 'image/png');
        updateMetaTag('og:type', type);
        updateMetaTag('og:site_name', 'youtube.money-hotissue.com');
        updateMetaTag('og:locale', 'ko_KR');
        
        // Twitter 메타 태그 설정
        updateNameMetaTag('twitter:card', 'summary_large_image');
        updateNameMetaTag('twitter:title', title);
        updateNameMetaTag('twitter:description', description);
        updateNameMetaTag('twitter:image', resolvedImage);
        updateNameMetaTag('twitter:image:width', '1200');
        updateNameMetaTag('twitter:image:height', '630');
        
        // 일반 메타 태그 설정
        updateNameMetaTag('description', description);

        // URL 변경
        if (typeof window !== 'undefined') {
            const path = new URL(resolvedUrl).pathname || '/';
            if (window.location.pathname !== path) {
                window.history.pushState({}, '', path);
            }
        }
    }, [title, description, url, image, type]);

    return null;
};

export default MetaTags;
