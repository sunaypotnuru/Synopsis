import { motion } from 'motion/react';

export function PageLoadingSkeleton() {
    return (
        <div className="min-h-screen pt-24 pb-12 px-6 bg-slate-50/50 w-full animate-pulse">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Banner Skeleton */}
                <div className="w-full h-48 bg-slate-200/60 rounded-3xl overflow-hidden relative">
                    <motion.div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        animate={{ translateX: ['100%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    />
                </div>

                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 bg-slate-200/60 rounded-2xl relative overflow-hidden">
                            <motion.div
                                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                animate={{ translateX: ['100%'] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: 0.1 * i }}
                            />
                        </div>
                    ))}
                </div>

                {/* Content Area Skeleton */}
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="h-96 bg-slate-200/60 rounded-2xl relative overflow-hidden">
                        <motion.div
                            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                            animate={{ translateX: ['100%'] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: 0.2 }}
                        />
                    </div>
                    <div className="md:col-span-2 h-96 bg-slate-200/60 rounded-2xl relative overflow-hidden">
                        <motion.div
                            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                            animate={{ translateX: ['100%'] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: 0.3 }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function Skeleton({
    className = '',
    variant = 'rectangular',
    width,
    height,
    ...props
}: {
    className?: string;
    variant?: 'rectangular' | 'circular' | 'text';
    width?: number | string;
    height?: number | string;
    [key: string]: unknown;
}) {
    let roundedClass = 'rounded-md';
    if (variant === 'circular') roundedClass = 'rounded-full';
    if (variant === 'text') roundedClass = 'rounded';
    
    const style: React.CSSProperties = {};
    if (width !== undefined) style.width = width;
    if (height !== undefined) style.height = height;

    return (
        <div
            className={`bg-slate-200/60 animate-pulse ${roundedClass} ${className}`}
            style={style}
            {...props}
        >
            <motion.div
                className="w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ translateX: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            />
        </div>
    );
}
