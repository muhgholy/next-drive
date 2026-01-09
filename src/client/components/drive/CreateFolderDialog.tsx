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

type CreateFolderFormData = {
    name: string;
};

export const CreateFolderDialog = (props: Readonly<{
    open: boolean;
    onClose: () => void;
    onConfirm: (name: string) => Promise<void>;
}>) => {
    const { open, onClose, onConfirm } = props;

    const {
        register,
        handleSubmit,
        reset,
        setFocus,
        formState: { errors, isSubmitting },
    } = useForm<CreateFolderFormData>({
        defaultValues: {
            name: '',
        },
    });

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            reset();
            // Focus input after a short delay to ensure dialog is rendered
            setTimeout(() => setFocus('name'), 100);
        }
    }, [open, reset, setFocus]);

    const handleFormSubmit = async (data: CreateFolderFormData) => {
        try {
            await onConfirm(data.name);
            reset();
            onClose();
        } catch (error) {
            // Error will be handled by parent component
            console.error('Failed to create folder:', error);
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
                        <DialogTitle>Create New Folder</DialogTitle>
                        <DialogDescription>
                            Enter a name for the new folder
                        </DialogDescription>
                    </DialogHeader>

                    {errors.name && (
                        <Alert variant="destructive">
                            <AlertCircle className="nd-h-4 nd-w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{errors.name.message}</AlertDescription>
                        </Alert>
                    )}

                    <div className="nd-grid nd-gap-4 nd-py-4">
                        <div className="nd-grid nd-gap-2">
                            <Label htmlFor="folder-name">Folder name</Label>
                            <Input
                                id="folder-name"
                                {...register('name', {
                                    required: 'Folder name is required',
                                    validate: (value) => {
                                        const trimmed = value.trim();
                                        if (!trimmed) return 'Folder name cannot be empty';
                                        if (trimmed.length > 255)
                                            return 'Folder name is too long';
                                        return true;
                                    },
                                })}
                                placeholder="Enter folder name"
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
                            {isSubmitting ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
