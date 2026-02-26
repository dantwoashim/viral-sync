'use client';

import { useEffect, useState } from 'react';

const PATH_EVENT = 'vs-path-change';

declare global {
    interface Window {
        __vsPathPatched?: boolean;
    }
}

function dispatchPathEvent() {
    window.dispatchEvent(new Event(PATH_EVENT));
}

function patchHistoryEvents() {
    if (typeof window === 'undefined' || window.__vsPathPatched) {
        return;
    }

    const rawPushState = window.history.pushState;
    const rawReplaceState = window.history.replaceState;

    window.history.pushState = function patchedPushState(...args) {
        rawPushState.apply(this, args);
        dispatchPathEvent();
    };

    window.history.replaceState = function patchedReplaceState(...args) {
        rawReplaceState.apply(this, args);
        dispatchPathEvent();
    };

    window.__vsPathPatched = true;
}

export function useClientPathname(): string | null {
    const [pathname, setPathname] = useState<string | null>(() => {
        if (typeof window === 'undefined') {
            return null;
        }
        return window.location.pathname || '/';
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        patchHistoryEvents();

        const update = () => setPathname(window.location.pathname || '/');
        update();

        window.addEventListener(PATH_EVENT, update);
        window.addEventListener('popstate', update);
        window.addEventListener('hashchange', update);

        return () => {
            window.removeEventListener(PATH_EVENT, update);
            window.removeEventListener('popstate', update);
            window.removeEventListener('hashchange', update);
        };
    }, []);

    return pathname;
}
