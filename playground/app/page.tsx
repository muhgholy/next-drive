'use client';

import { useState } from 'react';
import { DriveFileChooser, DriveProvider, TDriveFile } from '@muhgholy/next-drive/client';
import { ModeToggle } from '@/components/mode-toggle';

export default function Home() {
    const [selectedFile, setSelectedFile] = useState<TDriveFile | undefined>(undefined);

    return (
        <main className="relative min-h-screen bg-background text-foreground overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500/30 dark:bg-purple-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob" />
                <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500/30 dark:bg-yellow-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500/30 dark:bg-pink-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-6xl">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                            </svg>
                        </div>
                        <span className="font-semibold text-lg tracking-tight">Next Drive</span>
                    </div>
                    <ModeToggle />
                </div>
            </header>

            {/* Hero Section */}
            <section className="container mx-auto max-w-6xl px-4 pt-20 pb-12">
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-muted/50 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2 mr-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        Playground Environment
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text">
                        File Manager
                        <span className="block text-transparent bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 bg-clip-text">
                            Playground
                        </span>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                        Experience the power of Next Drive&apos;s file chooser component. 
                        Upload, browse, and select files with a beautiful, intuitive interface.
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <section className="container mx-auto max-w-6xl px-4 pb-20">
                <div className="grid gap-8 lg:grid-cols-5">
                    {/* File Chooser Card */}
                    <div className="lg:col-span-3">
                        <div className="group relative rounded-2xl border bg-card/50 backdrop-blur-sm p-8 shadow-xl shadow-black/5 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10">
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/10 via-transparent to-pink-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 text-violet-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold">File Chooser</h2>
                                        <p className="text-sm text-muted-foreground">Select files from your drive</p>
                                    </div>
                                </div>

                                <DriveProvider apiEndpoint="/api/drive">
                                    <DriveFileChooser
                                        value={selectedFile || null}
                                        onChange={(files) => {
                                            if (Array.isArray(files)) setSelectedFile(files[0] || undefined);
                                            else setSelectedFile(files || undefined);
                                        }}
                                        multiple={false}
                                        placeholder="Click to select a file..."
                                    />
                                </DriveProvider>

                                <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                                            <path d="m9 12 2 2 4-4" />
                                        </svg>
                                        <span>Drag & drop support</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                                            <path d="m9 12 2 2 4-4" />
                                        </svg>
                                        <span>Multiple providers</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Result Panel */}
                    <div className="lg:col-span-2">
                        <div className="sticky top-24 rounded-2xl border bg-card/50 backdrop-blur-sm shadow-xl shadow-black/5 overflow-hidden">
                            <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="h-3 w-3 rounded-full bg-red-500/80" />
                                        <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                                        <div className="h-3 w-3 rounded-full bg-green-500/80" />
                                    </div>
                                    <span className="text-sm font-medium ml-2">Output</span>
                                </div>
                                {selectedFile && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                                        File Selected
                                    </span>
                                )}
                            </div>
                            <div className="p-5">
                                {selectedFile ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                                                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{selectedFile.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {selectedFile.mimeType || 'Unknown type'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-muted/30 p-4">
                                            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">JSON Response</p>
                                            <pre className="text-xs overflow-auto max-h-48 text-muted-foreground font-mono leading-relaxed">
                                                {JSON.stringify(selectedFile, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
                                                <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
                                                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                                                <path d="m3 15 2 2 4-4" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium text-muted-foreground">No file selected</p>
                                        <p className="text-xs text-muted-foreground/70 mt-1">
                                            Select a file to see the result here
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t bg-muted/30 backdrop-blur-sm">
                <div className="container mx-auto max-w-6xl px-4 py-6 flex items-center justify-between text-sm text-muted-foreground">
                    <p>Built with Next Drive</p>
                    <p>© {new Date().getFullYear()} Playground</p>
                </div>
            </footer>
        </main>
    );
}
