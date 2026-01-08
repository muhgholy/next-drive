'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/client/components/ui/alert';
import { Button } from '@/client/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/client/components/ui/dialog';
import { Input } from '@/client/components/ui/input';
import { Label } from '@/client/components/ui/label';
import type { TDatabaseDrive } from '@/types/server';

type RenameFormData = {
    name: string;
};

export const RenameDialog = (props: Readonly<{
    open: boolean;
    onClose: () => void;
    item: TDatabaseDrive | null;
    onConfirm: (id: string, newName: string) => Promise<void>;
}>) => {
    const { open, onClose, item, onConfirm } = props;

    const {
        register,
        handleSubmit,
        reset,
        setFocus,
        formState: { errors, isSubmitting },
    } = useForm<RenameFormData>({
        defaultValues: {
            name: '',
        },
    });

    // Reset form when dialog opens or item changes
    useEffect(() => {
        if (open && item) {
            reset({ name: item.name });
            // Focus input and select text after a short delay
            setTimeout(() => {
                setFocus('name');
                // Select all text for easy replacement
                const input = document.getElementById('rename-input') as HTMLInputElement;
                if (input) {
                    input.select();
                }
            }, 100);
        }
    }, [open, item, reset, setFocus]);

    const handleFormSubmit = async (data: RenameFormData) => {
        if (!item) return;

        try {
            await onConfirm(item.id, data.name);
            reset();
            onClose();
        } catch (error) {
            console.error('Failed to rename item:', error);
        }
    };

    const handleClose = () => {
        if (isSubmitting) return;
        reset();
        onClose();
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            handleClose();
        }
    };

    const itemType = item?.information.type === 'FOLDER' ? 'Folder' : 'File';

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                showCloseButton={false}
                onInteractOutside={(e) => {
                    if (isSubmitting) {
                        e.preventDefault();
                    }
                }}
                onEscapeKeyDown={(e) => {
                    if (isSubmitting) {
                        e.preventDefault();
                    }
                }}
            >
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                    <DialogHeader>
                        <DialogTitle>Rename {itemType}</DialogTitle>
                        <DialogDescription>Enter a new name for this {itemType.toLowerCase()}</DialogDescription>
                    </DialogHeader>

                    {errors.name && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{errors.name.message}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="rename-input">Name</Label>
                            <Input
                                id="rename-input"
                                {...register('name', {
                                    required: 'Name is required',
                                    validate: (value) => {
                                        const trimmed = value.trim();
                                        if (!trimmed) return 'Name cannot be empty';
                                        if (trimmed.length > 255) return 'Name is too long';
                                        return true;
                                    },
                                })}
                                placeholder="Enter name"
                                disabled={isSubmitting}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Renaming...' : 'Rename'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
