// src/components/contacts/import-contact-dialog.tsx
"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // For file input styling (optional)
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For displaying errors
import { useRouter } from 'next/navigation';
import { importContacts } from "@/actions/contact-actions"; // Import the server action
import type { Contact } from "@/services/message-service"; // Import type if needed

interface ImportContactsDialogProps {
    triggerButton: React.ReactNode;
}

type ParsedContact = Pick<Contact, 'name' | 'phone'>;

export function ImportContactsDialog({ triggerButton }: ImportContactsDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isParsing, setIsParsing] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [parsedData, setParsedData] = React.useState<ParsedContact[]>([]);
    const [parseErrors, setParseErrors] = React.useState<string[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const router = useRouter();

    const resetState = () => {
        setIsLoading(false);
        setIsParsing(false);
        setSelectedFile(null);
        setParsedData([]);
        setParseErrors([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset file input
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            setSelectedFile(null);
            setParsedData([]);
            setParseErrors([]);
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a CSV file." });
            resetState();
            return;
        }

        setSelectedFile(file);
        setParsedData([]); // Clear previous parsed data
        setParseErrors([]); // Clear previous errors
        setIsParsing(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
                setParseErrors(["Could not read file content."]);
                setIsParsing(false);
                return;
            }

            try {
                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    throw new Error("CSV must contain at least a header row and one data row.");
                }

                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                const nameHeaderIndex = headers.indexOf('name');
                const phoneHeaderIndex = headers.indexOf('phone');

                if (nameHeaderIndex === -1 || phoneHeaderIndex === -1) {
                    throw new Error("CSV must contain both 'name' and 'phone' columns (case-insensitive).");
                }

                const data: ParsedContact[] = [];
                const errors: string[] = [];

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',');
                    const name = values[nameHeaderIndex]?.trim();
                    const phone = values[phoneHeaderIndex]?.trim();

                    if (!name || !phone) {
                        errors.push(`Row ${i + 1}: Missing name or phone.`);
                        continue; // Skip row if essential data is missing
                    }

                    // Basic validation (more robust validation happens in the server action)
                    if (name.length > 100) errors.push(`Row ${i + 1}: Name too long.`);
                    if (phone.length < 5 || phone.length > 20) errors.push(`Row ${i + 1}: Phone number length invalid.`);
                    // A simple regex check here is optional, rely on server for final validation
                    // const phoneRegex = /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/;
                    // if (!phoneRegex.test(phone)) errors.push(`Row ${i + 1}: Invalid phone format.`);

                    // Only add if name and phone are present
                    if (name && phone) {
                        data.push({ name, phone });
                    }
                }

                if (errors.length > 0) {
                    setParseErrors(errors); // Show parsing errors
                }
                setParsedData(data); // Store successfully parsed data

            } catch (error: any) {
                setParseErrors([error.message || "Failed to parse CSV file."]);
                setParsedData([]); // Clear data on error
            } finally {
                setIsParsing(false);
            }
        };

        reader.onerror = () => {
            setParseErrors(["Failed to read the file."]);
            setIsParsing(false);
        };

        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (parsedData.length === 0 || isLoading || isParsing) {
            toast({ variant: "destructive", title: "No Data", description: "No valid contact data parsed from the file." });
            return;
        }

        setIsLoading(true);
        try {
            const result = await importContacts(parsedData);

            if (result.success) {
                toast({
                    title: "Import Successful",
                    description: result.message,
                });
                setOpen(false); // Close dialog on success
                router.refresh(); // Refresh contacts list
                resetState();
            } else {
                // Show detailed errors from the server action if available
                let errorDescription = result.message;
                if (result.errors && result.errors.length > 0) {
                    errorDescription += `\n\nFirst few errors:\n${result.errors.slice(0, 5).map(e => `- Row ${e.row}: ${e.message}`).join('\n')}`;
                }
                toast({
                    variant: "destructive",
                    title: "Import Failed",
                    description: <pre className="whitespace-pre-wrap text-xs">{errorDescription}</pre>, // Use pre for formatting
                    duration: 10000 // Longer duration for errors
                });
            }
        } catch (error: any) {
            console.error("Error importing contacts:", error);
            toast({
                variant: "destructive",
                title: "Import Error",
                description: "An unexpected error occurred during import.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle dialog open/close changes
    const onOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            resetState(); // Reset state when closing
        }
        setOpen(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>{triggerButton}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Contacts from CSV</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file with 'name' and 'phone' columns. The first row should be the header.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="csv-file">CSV File</Label>
                        <Input
                            id="csv-file"
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            disabled={isLoading || isParsing}
                            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                        {selectedFile && (
                            <p className="text-sm text-muted-foreground">Selected: {selectedFile.name}</p>
                        )}
                    </div>

                    {isParsing && <p className="text-sm text-muted-foreground">Parsing file...</p>}

                    {parseErrors.length > 0 && (
                        <Alert variant="destructive">
                            <AlertTitle>CSV Parsing Errors</AlertTitle>
                            <AlertDescription className="max-h-40 overflow-y-auto text-xs">
                                <ul className="list-disc pl-5">
                                    {parseErrors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                                    {parseErrors.length > 10 && <li>... and {parseErrors.length - 10} more errors.</li>}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    {parsedData.length > 0 && !isParsing && parseErrors.length === 0 && (
                        <Alert variant="default">
                            <AlertTitle>Ready to Import</AlertTitle>
                            <AlertDescription>Found {parsedData.length} valid contact(s) in the file.</AlertDescription>
                        </Alert>
                    )}
                    {parsedData.length > 0 && !isParsing && parseErrors.length > 0 && (
                        <Alert variant="default">
                            <AlertTitle>Ready to Import (with errors)</AlertTitle>
                            <AlertDescription>Found {parsedData.length} potentially valid contact(s). Rows with errors listed above will be skipped.</AlertDescription>
                        </Alert>
                    )}

                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isLoading}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        onClick={handleImport}
                        disabled={isLoading || isParsing || parsedData.length === 0}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                        {isLoading ? "Importing..." : `Import ${parsedData.length} Contact(s)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
