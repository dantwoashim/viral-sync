'use client';

import React from 'react';

export default function POSLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="pos-shell">
            {children}
        </div>
    );
}
