// ** Drive File Chooser Component
'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { TDriveFile } from '@/types/client';
import { useDrive } from '@/client/context';
import { cn, getFileIcon } from '@/client/utils';
import { DriveExplorer } from '@/client/components/drive/explorer';
import { DriveHeader } from '@/client/components/drive/header';
import { DriveSidebar } from '@/client/components/drive/sidebar';
import { Upload as UploadIcon, X } from 'lucide-react';
import { Button } from '@/client/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/client/components/ui/dialog';

// ** Drive File Chooser Component (requires DriveProvider)
export const DriveFileChooser = (props: Readonly<{
     value: TDriveFile | TDriveFile[] | null;
     onChange: (files: TDriveFile | TDriveFile[] | null) => void;
     multiple?: boolean;
     accept?: string;
     placeholder?: string;
     className?: string;
     disabled?: boolean;
     error?: boolean;
     helperText?: string;
}>) => {
     // ** Deconstruct Props with defaults
     const {
          value, onChange, multiple, accept, placeholder,
          className, disabled, error, helperText
     } = {
          multiple: false,
          placeholder: 'Choose files...',
          className: '',
          disabled: false,
          ...props
     };
     const { items, selectedFileIds, setSelectedFileIds, createUrl } = useDrive();
     const [isOpen, setIsOpen] = useState(false);

     // ** Sync Selection when Open
     useEffect(() => {
          if (isOpen) {
               if (!value) setSelectedFileIds([]);
               else if (Array.isArray(value)) setSelectedFileIds(value.map(f => f.id));
               else setSelectedFileIds([value.id]);
          }
     }, [isOpen, value, setSelectedFileIds]);

     // ** External Handlers
     const handleConfirm = useCallback(() => {
          // Find selected items from current items list. 
          // Note: This relies on items being loaded. If selected items are not in current folder, this fails.
          // Ideally we need to fetchByIds, but for now we assume selection happens in current view.
          const selectedItems = items.filter(item => selectedFileIds.includes(item.id));

          // If we selected something that isn't in 'items' (e.g. pre-selected prop), we might lose it if we filter only 'items'.
          // But for a picker, we usually pick what we see.

          const files: TDriveFile[] = selectedItems.map(item => ({
               id: item.id,
               file: { name: item.name, mime: item.information.type === 'FILE' ? item.information.mime : '', size: item.information.type === 'FILE' ? item.information.sizeInBytes : 0 }
          }));

          onChange(multiple ? files : files[0] || null);
          setIsOpen(false);
     }, [items, selectedFileIds, multiple, onChange]);

     const handleRemove = (idToRemove: string) => {
          if (multiple && Array.isArray(value)) {
               onChange(value.filter(f => f.id !== idToRemove));
          } else {
               onChange(null);
          }
     };

     const hasSelection = value && (Array.isArray(value) ? value.length > 0 : true);
     const displayFiles = useMemo(() => {
          if (!value) return [];
          return Array.isArray(value) ? value : [value];
     }, [value]);

     const isSingle = !multiple;

     return (
          <div className={cn("space-y-1.5", className)}>
               {/* Empty State / Trigger */}
               {!hasSelection && (
                    <Button
                         type="button"
                         variant="outline"
                         onClick={() => setIsOpen(true)}
                         disabled={disabled}
                         className={cn(
                              "w-full h-auto justify-start gap-3 px-3 py-2.5 border-dashed",
                              error && "border-destructive"
                         )}
                    >
                         <div className={cn(
                              "flex items-center justify-center size-9 rounded-md bg-muted",
                              error && "bg-destructive/10"
                         )}>
                              <UploadIcon className={cn("size-4", error ? "text-destructive" : "text-muted-foreground")} />
                         </div>
                         <div className="flex-1 min-w-0">
                              <p className={cn("text-sm font-medium", error && "text-destructive")}>
                                   {isSingle ? "Select a file" : "Select files"}
                              </p>
                              <p className="text-xs text-muted-foreground">{placeholder}</p>
                         </div>
                    </Button>
               )}

               {/* Selected File Display (Single) */}
               {hasSelection && isSingle && displayFiles[0] && (
                    <div className={cn(
                         "flex items-center gap-2.5 px-2.5 py-2 rounded-md border bg-muted/30",
                         error && "border-destructive",
                         disabled && "opacity-50"
                    )}>
                         <div className="size-10 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
                              {displayFiles[0].file.mime.startsWith('image/') ? (
                                   <img
                                        src={createUrl({ id: displayFiles[0].id, file: displayFiles[0].file }, { quality: 'low', format: 'webp' })}
                                        alt={displayFiles[0].file.name}
                                        className="size-full object-cover"
                                   />
                              ) : (
                                   getFileIcon(displayFiles[0].file.mime, false, "size-5 text-muted-foreground")
                              )}
                         </div>
                         <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{displayFiles[0].file.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{displayFiles[0].file.mime}</p>
                         </div>
                         <div className="flex items-center gap-1 shrink-0">
                              <Button
                                   type="button"
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => setIsOpen(true)}
                                   disabled={disabled}
                              >
                                   Change
                              </Button>
                              {!disabled && (
                                   <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemove(displayFiles[0].id)}
                                   >
                                        <X className="size-3.5" />
                                   </Button>
                              )}
                         </div>
                    </div>
               )}

               {/* Selected Files Display (Multiple) */}
               {hasSelection && !isSingle && (
                    <div className={cn(
                         "rounded-md border",
                         error && "border-destructive",
                         disabled && "opacity-50"
                    )}>
                         <div className="flex items-center justify-between px-2.5 py-1.5 border-b bg-muted/30">
                              <span className="text-xs text-muted-foreground">
                                   {displayFiles.length} files selected
                              </span>
                              <div className="flex items-center gap-1">
                                   <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsOpen(true)}
                                        disabled={disabled}
                                   >
                                        Add more
                                   </Button>
                                   {!disabled && (
                                        <Button
                                             type="button"
                                             variant="ghost"
                                             size="sm"
                                             onClick={() => onChange([])}
                                        >
                                             Clear all
                                        </Button>
                                   )}
                              </div>
                         </div>
                         <div className="divide-y max-h-40 overflow-y-auto">
                              {displayFiles.map((file) => (
                                   <div key={file.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/30">
                                        <div className="size-7 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
                                             {file.file.mime.startsWith('image/') ? (
                                                  <img
                                                       src={createUrl({ id: file.id, file: file.file }, { quality: 'ultralow', format: 'webp' })}
                                                       alt={file.file.name}
                                                       className="size-full object-cover"
                                                  />
                                             ) : (
                                                  getFileIcon(file.file.mime, false, "size-3.5 text-muted-foreground")
                                             )}
                                        </div>
                                        <span className="flex-1 min-w-0 text-sm truncate">{file.file.name}</span>
                                        {!disabled && (
                                             <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() => handleRemove(file.id)}
                                             >
                                                  <X className="size-3" />
                                             </Button>
                                        )}
                                   </div>
                              ))}
                         </div>
                    </div>
               )}

               {error && helperText && <p className="text-xs text-destructive">{helperText}</p>}

               {/* Main Picker Dialog */}
               <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="sm:max-w-5xl max-h-[85vh] w-[95vw] flex flex-col gap-0 p-0">
                         <DialogHeader className="px-0 py-0 border-b shrink-0 flex flex-col gap-0">
                              <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b">
                                   <DialogTitle className="text-sm sm:text-base">File Explorer</DialogTitle>
                              </div>
                         </DialogHeader>

                         <div className="flex-1 overflow-hidden flex min-h-0 bg-muted/5">
                              <div className="hidden md:flex w-48 lg:w-52 border-r bg-background/50 flex-col">
                                   <DriveSidebar />
                              </div>
                              <div className="flex-1 flex flex-col min-w-0">
                                   <DriveHeader />
                                   <DriveExplorer
                                        mimeFilter={accept}
                                   />
                              </div>
                         </div>
                         <DialogFooter className="px-3 sm:px-4 py-3 border-t bg-background shrink-0 gap-2 flex-row justify-end">
                              <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                                   Cancel
                              </Button>
                              <Button
                                   type="button"
                                   size="sm"
                                   onClick={handleConfirm}
                                   disabled={selectedFileIds.length === 0}
                              >
                                   Select {selectedFileIds.length > 0 ? `(${selectedFileIds.length})` : ''}
                              </Button>
                         </DialogFooter>
                    </DialogContent>
               </Dialog>
          </div>
     );
};
