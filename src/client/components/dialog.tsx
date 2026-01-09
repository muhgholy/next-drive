import { useEffect, useState } from 'react';
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

// ** Define input type with required field
type TInputDefinition = {
    type: 'INPUT',
    id: string,
    name: string,
    default?: string,
    required?: boolean
};

// ** Helper type to extract input values based on input definitions
type TInputValues<T extends readonly TInputDefinition[]> = { [K in T[number]['id']]: string };

export const DialogConfirmation = <T extends readonly TInputDefinition[] | undefined = undefined>(
    props: Readonly<{
        title: string
        description: string
        open: boolean
        onClose: () => void
        inputs?: T
        onConfirm: T extends readonly TInputDefinition[]
        ? (inputs: Readonly<TInputValues<T>>) => Promise<[true] | [false, string]>
        : () => Promise<[true] | [false, string]>
        disableEscapeKeyDown?: boolean
    }>
) => {
    // ** Deconstruct Props
    const { title, description, onConfirm, disableEscapeKeyDown, inputs, onClose, open } = props

    // ** State
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [inputsValue, setInputsValue] = useState<{ [key: string]: string }>(() =>
        inputs?.reduce((acc, input) => ({
            ...acc, [input.id]: input.default ?? ''
        }), {}) ?? {}
    )

    // ** Function
    const handleConfirm = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response = await (inputs ? (onConfirm as any)(inputsValue) : (onConfirm as any)());
            if (response[0]) {
                onClose();
            } else {
                setError(response[1]);
            }
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    }

    const handleClose = () => {
        if (isLoading) return
        onClose()
    }

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            handleClose();
        }
    }

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && isFormValid()) {
            event.preventDefault()
            handleConfirm()
        }
    }

    const isFormValid = (): boolean => {
        if (!inputs) return true
        return inputs.every(input =>
            !input.required || (inputsValue[input.id] && inputsValue[input.id].trim() !== '')
        )
    }

    // ** Effect to reset input values when inputs change or dialog opens
    useEffect(() => {
        if (open) {
            setInputsValue(
                inputs?.reduce((acc, input) => ({
                    ...acc, [input.id]: input.default ?? ''
                }), {}) ?? {}
            )
            setError(null)
        }
    }, [inputs, open])

    // ** Render
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                showCloseButton={false}
                onInteractOutside={(e) => {
                    if (disableEscapeKeyDown) {
                        e.preventDefault();
                    }
                }}
                onEscapeKeyDown={(e) => {
                    if (disableEscapeKeyDown) {
                        e.preventDefault();
                    }
                }}
            >
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="nd:h-4 nd:w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {inputs && inputs.length > 0 && (
                    <div className="nd:grid nd:gap-4 nd:py-4">
                        {inputs.map((input, index) => (
                            <div key={input.id} className="nd:grid nd:gap-2">
                                <Label htmlFor={input.id}>{input.name}</Label>
                                <Input
                                    id={input.id}
                                    required={input.required}
                                    value={inputsValue[input.id] || ''}
                                    onChange={(e) =>
                                        setInputsValue({ ...inputsValue, [input.id]: e.target.value })
                                    }
                                    onKeyDown={index === inputs.length - 1 ? handleKeyPress : undefined}
                                />
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading || !isFormValid()}
                    >
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
