"use client";
import { RotateCcw } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function ResetButton() {
    const { resetThemeData } = useTheme();

    return (
        <button
            type='button'
            onClick={resetThemeData}
            className='p-1 rounded-full bg-transparent hover:bg-primary-500 transition-colors '>
            <RotateCcw className="w-5 h-5" />
        </button>
    );
}