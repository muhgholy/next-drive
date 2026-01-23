'use client';

import { useEffect } from 'react';

// This placeholder will be replaced by the build script with the actual CSS content
const cssContent = '__ND_STYLES_PLACEHOLDER__';
const styleId = 'nd-injected-styles';

export const useStyleInjector = () => {
    useEffect(() => {
        if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = cssContent;
            document.head.appendChild(style);
        }
    }, []);
};
