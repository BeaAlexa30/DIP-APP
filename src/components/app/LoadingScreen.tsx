

'use client'

import { AnimatePresence, motion } from 'framer-motion'

export default function LoadingScreen({
    open = true,
    close = () => { }
}: {
    open?: boolean
    close?: () => void
}) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    onClick={close}
                >
                    <motion.div
                        className="bg-white rounded-lg shadow-xl px-10 py-8 flex flex-col items-center gap-4 border border-gray-100"
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Spinner */}
                        <motion.span
                            className="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-600"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-800">Loading</p>
                            <p className="text-xs text-gray-400 mt-0.5">Please wait…</p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}