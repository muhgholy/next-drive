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

type RenameAccountFormData = {
    name: string;
};

type Account = {
    id: string;
    name: string;
    email: string;
    provider: 'GOOGLE';
};

export const RenameAccountDialog = (props: Readonly<{
    open: boolean;
    onClose: () => void;
    account: Account | null;
    onConfirm: (account: Account, newName: string) => Promise<void>;
}>) => {
    const { open, onClose, account, onConfirm } = props;

    const {
        register,
        handleSubmit,
        reset,
        setFocus,
        formState: { errors, isSubmitting },
    } = useForm<RenameAccountFormData>({
        defaultValues: {
            name: '',
        },
    });

    // Reset form when dialog opens or account changes
    useEffect(() => {
        if (open && account) {
            reset({ name: account.name });
            // Focus input and select text after a short delay
            setTimeout(() => {
                setFocus('name');
                // Select all text for easy replacement
                const input = document.getElementById(
                    'rename-account-input'
                ) as HTMLInputElement;
                if (input) {
                    input.select();
                }
            }, 100);
        }
    }, [open, account, reset, setFocus]);

    const handleFormSubmit = async (data: RenameAccountFormData) => {
        if (!account) return;

        try {
            await onConfirm(account, data.name);
            reset();
            onClose();
        } catch (error) {
            console.error('Failed to rename account:', error);
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
                        <DialogTitle>Rename Account</DialogTitle>
                        <DialogDescription>
                            Enter a new display name for this storage account.
                        </DialogDescription>
                    </DialogHeader>

                    {errors.name && (
                        <Alert variant="destructive">
                            <AlertCircle className="nd:h-4 nd:w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{errors.name.message}</AlertDescription>
                        </Alert>
                    )}

                    <div className="nd:grid nd:gap-4 nd:py-4">
                        <div className="nd:grid nd:gap-2">
                            <Label htmlFor="rename-account-input">Account name</Label>
                            <Input
                                id="rename-account-input"
                                {...register('name', {
                                    required: 'Account name is required',
                                    validate: (value) => {
                                        const trimmed = value.trim();
                                        if (!trimmed) return 'Account name cannot be empty';
                                        if (trimmed.length > 255)
                                            return 'Account name is too long';
                                        return true;
                                    },
                                })}
                                placeholder="Enter account name"
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
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
