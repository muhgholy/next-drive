'use client';

import { useState } from 'react';
import { DriveFileChooser, DriveProvider, TDriveFile } from '@muhgholy/next-drive/client';
import { ModeToggle } from '@/components/mode-toggle';

export default function Home() {
     const [selectedFile, setSelectedFile] = useState<TDriveFile | undefined>(undefined);

     return (
          <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background text-foreground transition-colors duration-300">
               <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-8">
                    <h1 className="text-4xl font-bold">Next File Manager Playground</h1>
                    <ModeToggle />
               </div>

               <div className="bg-card text-card-foreground p-8 rounded-lg shadow-lg w-full max-w-4xl mb-8 border transition-colors duration-300">
                    <h2 className="text-2xl font-semibold mb-4">File Chooser Demo</h2>
                    <p className="text-muted-foreground mb-6">Select a file using the component below:</p>

                    <DriveProvider apiEndpoint="/api/drive">
                         <DriveFileChooser
                              value={selectedFile || null}
                              onChange={(files) => {
                                   if (Array.isArray(files)) setSelectedFile(files[0] || undefined);
                                   else setSelectedFile(files || undefined);
                              }}
                              multiple={false}
                              placeholder="Select a file..."
                         />
                    </DriveProvider>

                    {selectedFile && (
                         <div className="mt-8 p-4 border rounded bg-muted/30">
                              <h3 className="font-semibold mb-2">Selected File Result:</h3>
                              <pre className="text-xs overflow-auto max-h-60">
                                   {JSON.stringify(selectedFile, null, 2)}
                              </pre>
                         </div>
                    )}
               </div>
          </main>
     );
}
