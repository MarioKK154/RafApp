import React, { useState, useEffect } from 'react';

/**
 * AnimatedCountUp Component
 * Smoothly interpolates numeric values from start to target over a specified duration.
 */
function AnimatedCountUp({ value, duration = 800, prefix = "", suffix = "", formatter = null }) {
    const target = typeof value === 'number' ? value : parseFloat(value) || 0;
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        let startTime = null;
        let animationFrame = null;
        const startVal = current;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            
            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const nextVal = startVal + (target - startVal) * easeOut;
            
            setCurrent(nextVal);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [target, duration]);

    const displayVal = formatter 
        ? formatter(current) 
        : Math.round(current).toLocaleString();

    return <span>{prefix}{displayVal}{suffix}</span>;
}

export default AnimatedCountUp;
